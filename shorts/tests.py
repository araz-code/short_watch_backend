"""
Tests for shorts.management.commands.fetch_shorts.

These tests are intentionally behavioural — they pin down the *current* observable
behaviour of the fetch_shorts command so that any future refactor can be validated
against them. They cover:

  * Pure helpers in shorts.utils (parse_headline, parse_publication_date)
  * Static helpers on Command (get_or_create_stock, get_prev_value_for_large_selling,
    remove_duplicate_positions)
  * The core ingestion routine fetch_short_positions (prev_value linking, duplicate
    suppression, ShortPositionChart upsert, closing logic, the >30-closures
    safeguard, RunStatus, and notification dict assembly)
  * fetch_large_short_selling (HTTP failure, headline parsing, mapping miss,
    delete=True/False sweep behaviour, prev_value carry-over)
  * handle() (cache invalidation keys, RunStatus pruning, ordering)
  * send_push_notification (quiet hours sound choice, version-dependent loc_args,
    invalid-user short-circuit, FCM error handling, counter increment)

These tests do not exercise selenium, the network, Firebase, or the announcement
HTTP endpoints — those are mocked. The intent is to make the *Python* logic
verifiable without external dependencies.
"""

# -- Patch import-time side effects from fetch_shorts BEFORE importing it --------
# fetch_shorts.py runs `firebase_admin.initialize_app(cred)` at module import.
# We stub those out so tests can run without a real service account or Chrome.
from unittest import mock

_module_patches = [
    mock.patch('firebase_admin.credentials.Certificate', return_value=mock.MagicMock()),
    mock.patch('firebase_admin.initialize_app'),
]
for _p in _module_patches:
    _p.start()

# Now safe to import the command module.
from shorts.management.commands import fetch_shorts as fetch_shorts_module  # noqa: E402
from shorts.management.commands.fetch_shorts import Command  # noqa: E402

# -------------------------------------------------------------------------------

import json
from datetime import datetime, timedelta, date
from unittest.mock import patch, MagicMock, call

import pytz
from django.core.cache import cache
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone
from firebase_admin.exceptions import InvalidArgumentError
from firebase_admin.messaging import UnregisteredError

from errors.models import Error
from shorts.models import (
    Stock,
    ShortPosition,
    ShortPositionChart,
    LargeShortSelling,
    ShortSeller,
    RunStatus,
)
from shorts.utils import parse_headline, parse_publication_date
from users.models import AppUser

CPH = pytz.timezone('Europe/Copenhagen')


def make_stock(code='DK1', name='Test Stock A/S', symbol='TEST', active=True):
    return Stock.objects.create(code=code, name=name, symbol=symbol, active=active)


def make_short_position(stock, value, timestamp=None, prev_value=0):
    return ShortPosition.objects.create(
        stock=stock,
        value=value,
        prev_value=prev_value,
        timestamp=timestamp or timezone.now(),
    )


# =============================================================================
# Pure helpers — shorts.utils
# =============================================================================


class ParseHeadlineTests(TestCase):
    """parse_headline must accept the three known formats verbatim."""

    def test_standard_format_with_comma_decimal(self):
        result = parse_headline(
            'Fosse Capital Partners LLP holds a net short position of 0,99% in '
            'the share capital issued by Netcompany Group A/S'
        )
        self.assertEqual(result['seller_name'], 'Fosse Capital Partners LLP')
        self.assertAlmostEqual(result['value'], 0.99)
        self.assertFalse(result['is_historic'])
        self.assertFalse(result['is_cancellation'])

    def test_historic_format_with_dot_decimal_and_space_before_percent(self):
        result = parse_headline(
            '(Historical) Marshall Wace LLP holds a short position at 1.53 % in '
            'shares issued by Vestas Wind Systems A/S'
        )
        self.assertEqual(result['seller_name'], 'Marshall Wace LLP')
        self.assertAlmostEqual(result['value'], 1.53)
        self.assertTrue(result['is_historic'])
        self.assertFalse(result['is_cancellation'])

    def test_cancellation_format(self):
        result = parse_headline(
            '(Historical) CANCELLATION: Fosse Capital Partners LLP holds a net '
            'short position of 0,60% in something'
        )
        self.assertEqual(result['seller_name'], 'Fosse Capital Partners LLP')
        self.assertAlmostEqual(result['value'], 0.60)
        self.assertTrue(result['is_historic'])
        self.assertTrue(result['is_cancellation'])

    def test_unparseable_headline_returns_none(self):
        self.assertIsNone(parse_headline('Some unrelated announcement'))


class ParsePublicationDateTests(TestCase):
    def test_returns_copenhagen_aware_datetime(self):
        result = parse_publication_date('15-08-2024 14:30:00')
        self.assertEqual(result.year, 2024)
        self.assertEqual(result.month, 8)
        self.assertEqual(result.day, 15)
        self.assertEqual(result.hour, 14)
        self.assertEqual(result.minute, 30)
        self.assertIsNotNone(result.tzinfo)
        # Copenhagen in mid-August is UTC+2 (CEST)
        self.assertEqual(result.utcoffset(), timedelta(hours=2))


# =============================================================================
# Static helpers on Command
# =============================================================================


class GetOrCreateStockTests(TestCase):
    def test_returns_existing_stock_unmodified(self):
        existing = make_stock(code='DK1', name='Original Name', symbol='ORIG')
        result = Command.get_or_create_stock('DK1', 'Some Other Name')
        self.assertEqual(result.pk, existing.pk)
        self.assertEqual(result.name, 'Original Name')
        self.assertEqual(result.symbol, 'ORIG')

    def test_creates_new_stock_with_symbol_truncated_to_20_chars(self):
        long_name = 'A Very Very Very Long Company Name A/S'
        result = Command.get_or_create_stock('DK_NEW', long_name)
        self.assertEqual(result.code, 'DK_NEW')
        self.assertEqual(result.name, long_name)
        self.assertEqual(result.symbol, long_name[:20])
        self.assertEqual(len(result.symbol), 20)


class GetPrevValueForLargeSellingTests(TestCase):
    def setUp(self):
        self.stock = make_stock(code='DK1')
        self.seller = ShortSeller.objects.create(name='Acme LP')

    def test_returns_none_when_no_prior_record(self):
        published = CPH.localize(datetime(2026, 4, 24, 10, 0))
        result = Command.get_prev_value_for_large_selling(
            self.stock, 'Acme LP', published
        )
        self.assertIsNone(result)

    def test_same_date_returns_existing_prev_value(self):
        existing_date = date(2026, 4, 24)
        LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=self.seller,
            name='Acme LP',
            business_id='',
            value=1.20,
            date=existing_date,
            prev_value=0.95,
        )
        published = CPH.localize(datetime(2026, 4, 24, 12, 0))
        result = Command.get_prev_value_for_large_selling(
            self.stock, 'Acme LP', published
        )
        # Same publication date as record → keep the existing prev_value (don't shift)
        self.assertEqual(result, 0.95)

    def test_different_date_returns_existing_value_as_new_prev(self):
        LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=self.seller,
            name='Acme LP',
            business_id='',
            value=1.20,
            date=date(2026, 4, 23),
            prev_value=0.95,
        )
        published = CPH.localize(datetime(2026, 4, 24, 12, 0))
        result = Command.get_prev_value_for_large_selling(
            self.stock, 'Acme LP', published
        )
        # New date → previous value becomes the new prev_value
        self.assertEqual(result, 1.20)


class RemoveDuplicatePositionsTests(TestCase):
    def test_keeps_highest_id_and_deletes_rest_writing_error_log(self):
        stock = make_stock(code='DK1', symbol='TST')
        ts = timezone.now().replace(microsecond=0)
        first = ShortPosition.objects.create(stock=stock, value=1.0, timestamp=ts)
        second = ShortPosition.objects.create(stock=stock, value=2.0, timestamp=ts)
        third = ShortPosition.objects.create(stock=stock, value=3.0, timestamp=ts)

        Command.remove_duplicate_positions()

        # The .order_by('-id') in the implementation means highest id is kept.
        remaining = list(ShortPosition.objects.filter(stock=stock))
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0].pk, third.pk)
        self.assertFalse(ShortPosition.objects.filter(pk=first.pk).exists())
        self.assertFalse(ShortPosition.objects.filter(pk=second.pk).exists())

        # An Error row was logged describing the dedup
        self.assertTrue(Error.objects.filter(message__startswith='Duplicate removed').exists())

    def test_no_duplicates_means_no_changes_and_no_errors(self):
        stock = make_stock(code='DK1', symbol='TST')
        a = make_short_position(stock, 1.0, timestamp=timezone.now())
        b = make_short_position(stock, 2.0, timestamp=timezone.now() + timedelta(seconds=5))

        Command.remove_duplicate_positions()

        self.assertTrue(ShortPosition.objects.filter(pk=a.pk).exists())
        self.assertTrue(ShortPosition.objects.filter(pk=b.pk).exists())
        self.assertFalse(Error.objects.exists())


# =============================================================================
# Core ingestion: fetch_short_positions (the static method)
# =============================================================================


@patch.object(Command, 'send_push_notification')
class FetchShortPositionsTests(TestCase):
    """
    These tests call the static ingestion method directly with a manually built
    list of ShortPosition instances (the same shape selenium / requests parsing
    produces). They pin down the prev_value linkage, duplicate suppression,
    chart upsert, and the closing-position logic.
    """

    def setUp(self):
        self.now = timezone.now().replace(microsecond=0)

    def _build(self, stock, value, timestamp=None):
        """Build an unsaved ShortPosition the way the parsers do."""
        return ShortPosition(
            stock=stock,
            value=value,
            timestamp=timestamp or self.now,
        )

    def test_first_position_for_stock_saves_with_default_prev_value(self, mock_push):
        stock = make_stock(code='DK1', symbol='TST')
        Command.fetch_short_positions([self._build(stock, 0.55)])

        positions = ShortPosition.objects.filter(stock=stock)
        # New position + (no prior so) no closing zero added for this stock
        self.assertEqual(positions.count(), 1)
        self.assertAlmostEqual(positions.first().value, 0.55)
        # prev_value was not set explicitly so it stays at the model default (0)
        self.assertEqual(positions.first().prev_value, 0)

    def test_subsequent_position_links_prev_value_from_latest_existing(self, mock_push):
        stock = make_stock(code='DK1', symbol='TST')
        earlier_ts = self.now - timedelta(hours=1)
        ShortPosition.objects.create(stock=stock, value=0.55, timestamp=earlier_ts)

        Command.fetch_short_positions([self._build(stock, 0.80)])

        latest = ShortPosition.objects.filter(stock=stock).order_by('-timestamp').first()
        self.assertAlmostEqual(latest.value, 0.80)
        self.assertAlmostEqual(latest.prev_value, 0.55)

    def test_duplicate_value_at_same_second_is_not_re_inserted(self, mock_push):
        stock = make_stock(code='DK1', symbol='TST')
        ShortPosition.objects.create(stock=stock, value=1.20, timestamp=self.now)

        Command.fetch_short_positions([self._build(stock, 1.20, timestamp=self.now)])

        # Still only one ShortPosition for this stock (no second one inserted)
        self.assertEqual(
            ShortPosition.objects.filter(stock=stock, value=1.20).count(), 1
        )

    def test_creates_run_status_row(self, mock_push):
        stock = make_stock(code='DK1')
        before = RunStatus.objects.count()
        Command.fetch_short_positions([self._build(stock, 0.10)])
        self.assertEqual(RunStatus.objects.count(), before + 1)

    def test_chart_upsert_writes_one_row_per_day_per_stock(self, mock_push):
        """ShortPositionChart is keyed on (stock, date) — same day = update."""
        stock = make_stock(code='DK1')
        Command.fetch_short_positions([self._build(stock, 0.10)])
        Command.fetch_short_positions([self._build(stock, 0.20)])
        # Same calendar day, so still one chart entry, with the latest value
        charts = ShortPositionChart.objects.filter(stock=stock)
        self.assertEqual(charts.count(), 1)
        self.assertAlmostEqual(charts.first().value, 0.20)

    def test_app_user_following_affected_stock_is_notified(self, mock_push):
        stock = make_stock(code='DK1', symbol='TST')
        user = AppUser.objects.create(fcm_token='token-1')
        user.stocks.add(stock)

        Command.fetch_short_positions([self._build(stock, 0.50)])

        # send_push_notification was called once for the only affected user.
        self.assertEqual(mock_push.call_count, 1)
        called_user, called_messages = mock_push.call_args.args
        self.assertEqual(called_user.pk, user.pk)
        self.assertEqual(called_messages, ['TST 0.50%'])

    def test_app_user_not_following_is_not_notified(self, mock_push):
        stock_a = make_stock(code='DK1', symbol='AAA')
        stock_b = make_stock(code='DK2', symbol='BBB')
        user = AppUser.objects.create(fcm_token='token-1')
        user.stocks.add(stock_b)  # only follows B

        Command.fetch_short_positions([self._build(stock_a, 0.30)])

        self.assertEqual(mock_push.call_count, 0)

    def test_disappearing_stock_is_closed_with_zero(self, mock_push):
        """A stock with a non-zero position not in the new feed is auto-closed at 0%."""
        stock_present = make_stock(code='DK_PRESENT', symbol='PRES')
        stock_gone = make_stock(code='DK_GONE', symbol='GONE')
        # Existing non-zero positions for both
        ShortPosition.objects.create(stock=stock_present, value=0.5, timestamp=self.now - timedelta(hours=1))
        ShortPosition.objects.create(stock=stock_gone, value=0.7, timestamp=self.now - timedelta(hours=1))

        # New feed only includes one of them
        Command.fetch_short_positions([self._build(stock_present, 0.6)])

        gone_positions = ShortPosition.objects.filter(stock=stock_gone).order_by('-timestamp')
        # A new 0.0 closing entry should now exist
        self.assertEqual(gone_positions.first().value, 0.0)
        self.assertAlmostEqual(gone_positions.first().prev_value, 0.7)

    def test_more_than_30_closures_aborts_closing_logic(self, mock_push):
        """Safety net: if too many stocks would be closed at once, none are."""
        stock_in_feed = make_stock(code='DK_KEEP', symbol='KEEP')
        ShortPosition.objects.create(stock=stock_in_feed, value=0.1, timestamp=self.now - timedelta(hours=1))
        # Create 31 stocks with non-zero positions that will be "missing" from feed
        gone_stocks = []
        for i in range(31):
            s = make_stock(code=f'GONE_{i}', symbol=f'G{i:02d}')
            ShortPosition.objects.create(stock=s, value=0.5, timestamp=self.now - timedelta(hours=1))
            gone_stocks.append(s)

        Command.fetch_short_positions([self._build(stock_in_feed, 0.2)])

        # No 0.0 closing entries should have been inserted
        for s in gone_stocks:
            zeros = ShortPosition.objects.filter(stock=s, value=0.0)
            self.assertEqual(zeros.count(), 0, f'unexpected zero close for {s.code}')

        # But an Error row WAS logged about the unexpected count
        self.assertTrue(Error.objects.filter(
            message__contains='unexpected number of shorts got closed'
        ).exists())

    def test_existing_zero_for_disappeared_stock_does_not_create_another_zero(self, mock_push):
        stock = make_stock(code='DK1', symbol='TST')
        # Already at 0% from a prior run
        ShortPosition.objects.create(stock=stock, value=0.0, timestamp=self.now - timedelta(hours=1))

        Command.fetch_short_positions([])  # empty feed

        zeros = ShortPosition.objects.filter(stock=stock, value=0.0)
        # Still exactly the one zero that was there before
        self.assertEqual(zeros.count(), 1)


# =============================================================================
# fetch_large_short_selling
# =============================================================================


class FetchLargeShortSellingTests(TestCase):
    """
    fetch_large_short_selling makes one HTTP POST to a search endpoint and then
    upserts LargeShortSelling rows. We mock requests.post to feed in canned rows.
    """

    def setUp(self):
        self.cmd = Command()
        self.stock = make_stock(code='DK_NETC', name='Netcompany Group A/S', symbol='NETC')

    def _api_response(self, rows, status=200):
        resp = MagicMock()
        resp.status_code = status
        resp.json.return_value = {'data': {'rows': rows}}
        return resp

    @patch('shorts.management.commands.fetch_shorts.requests.post')
    def test_non_200_raises_command_error_and_logs(self, mock_post):
        mock_post.return_value = self._api_response([], status=503)

        with self.assertRaises(CommandError):
            self.cmd.fetch_large_short_selling()

        self.assertTrue(Error.objects.filter(
            message__contains='Failed to fetch large sellers'
        ).exists())

    @patch('shorts.management.commands.fetch_shorts.requests.post')
    def test_creates_new_seller_and_record_for_unknown_seller(self, mock_post):
        mock_post.return_value = self._api_response([{
            'HeadlineColumn': (
                'Marshall Wace LLP holds a net short position of 0,75% in '
                'the share capital issued by Netcompany Group A/S'
            ),
            'IssuerColumn': 'Netcompany Group A/S',
            'PublicationDateColumn': '24-04-2026 12:00:00',
        }])

        self.cmd.fetch_large_short_selling()

        seller = ShortSeller.objects.get(name='Marshall Wace LLP')
        record = LargeShortSelling.objects.get(stock=self.stock, name='Marshall Wace LLP')
        self.assertEqual(record.short_seller_id, seller.id)
        self.assertAlmostEqual(record.value, 0.75)
        self.assertEqual(record.date, date(2026, 4, 24))
        self.assertFalse(record.delete)

    @patch('shorts.management.commands.fetch_shorts.requests.post')
    def test_unparseable_headline_logs_error_and_skips_row(self, mock_post):
        mock_post.return_value = self._api_response([{
            'HeadlineColumn': 'Random unparseable text',
            'IssuerColumn': 'Netcompany Group A/S',
            'PublicationDateColumn': '24-04-2026 12:00:00',
        }])

        self.cmd.fetch_large_short_selling()

        self.assertEqual(LargeShortSelling.objects.count(), 0)
        self.assertTrue(Error.objects.filter(
            message__contains='Could not parse seller headline'
        ).exists())

    @patch('shorts.management.commands.fetch_shorts.requests.post')
    def test_unmappable_issuer_is_skipped_silently(self, mock_post):
        # No Stock with that name exists
        mock_post.return_value = self._api_response([{
            'HeadlineColumn': (
                'Marshall Wace LLP holds a net short position of 0,75% in '
                'the share capital issued by Mystery Issuer A/S'
            ),
            'IssuerColumn': 'Mystery Issuer A/S',
            'PublicationDateColumn': '24-04-2026 12:00:00',
        }])

        self.cmd.fetch_large_short_selling()
        self.assertEqual(LargeShortSelling.objects.count(), 0)

    @patch('shorts.management.commands.fetch_shorts.requests.post')
    def test_seller_no_longer_in_feed_is_swept_away(self, mock_post):
        """Records absent from the new feed have delete=True after the upserts and are deleted."""
        existing_seller = ShortSeller.objects.create(name='Old Seller LP')
        LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=existing_seller,
            name='Old Seller LP',
            business_id='',
            value=0.6,
            date=date(2026, 4, 23),
        )

        # New feed mentions a different seller, not the old one
        mock_post.return_value = self._api_response([{
            'HeadlineColumn': (
                'New Seller LP holds a net short position of 0,80% in '
                'the share capital issued by Netcompany Group A/S'
            ),
            'IssuerColumn': 'Netcompany Group A/S',
            'PublicationDateColumn': '24-04-2026 12:00:00',
        }])

        self.cmd.fetch_large_short_selling()

        self.assertFalse(
            LargeShortSelling.objects.filter(name='Old Seller LP').exists(),
            'Stale record should have been deleted'
        )
        self.assertTrue(
            LargeShortSelling.objects.filter(name='New Seller LP').exists()
        )

    @patch('shorts.management.commands.fetch_shorts.requests.post')
    def test_existing_record_for_different_date_carries_old_value_as_prev(self, mock_post):
        seller = ShortSeller.objects.create(name='Marshall Wace LLP')
        LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=seller,
            name='Marshall Wace LLP',
            business_id='',
            value=0.50,
            date=date(2026, 4, 23),
            prev_value=0.40,
        )

        mock_post.return_value = self._api_response([{
            'HeadlineColumn': (
                'Marshall Wace LLP holds a net short position of 0,75% in '
                'the share capital issued by Netcompany Group A/S'
            ),
            'IssuerColumn': 'Netcompany Group A/S',
            'PublicationDateColumn': '24-04-2026 12:00:00',
        }])

        self.cmd.fetch_large_short_selling()

        record = LargeShortSelling.objects.get(name='Marshall Wace LLP', stock=self.stock)
        self.assertAlmostEqual(record.value, 0.75)
        self.assertEqual(record.date, date(2026, 4, 24))
        # prev_value should now be the previously-saved value (different date branch)
        self.assertAlmostEqual(record.prev_value, 0.50)


# =============================================================================
# handle() — orchestration, cache invalidation, RunStatus pruning
# =============================================================================


class HandleOrchestrationTests(TestCase):
    """We mock out every external collaborator and assert the side effects we care about."""

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_invalidates_the_four_expected_caches(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        cache.set('short_positions_list', 'A', timeout=None)
        cache.set('short_sellers_list', 'B', timeout=None)
        cache.set('homepage_stats', 'C', timeout=None)
        cache.set('top_lists', 'D', timeout=None)
        # An unrelated key should NOT be wiped
        cache.set('unrelated_key', 'KEEP', timeout=None)

        Command().handle()

        self.assertIsNone(cache.get('short_positions_list'))
        self.assertIsNone(cache.get('short_sellers_list'))
        self.assertIsNone(cache.get('homepage_stats'))
        self.assertIsNone(cache.get('top_lists'))
        self.assertEqual(cache.get('unrelated_key'), 'KEEP')

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_prunes_run_status_older_than_three_days(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        old = RunStatus.objects.create()
        RunStatus.objects.filter(pk=old.pk).update(
            executed_at=timezone.now() - timedelta(days=4)
        )
        recent = RunStatus.objects.create()

        Command().handle()

        self.assertFalse(RunStatus.objects.filter(pk=old.pk).exists())
        self.assertTrue(RunStatus.objects.filter(pk=recent.pk).exists())

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_swallows_selenium_exceptions_and_continues(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        mock_driver.return_value = MagicMock()
        mock_selenium.side_effect = Exception('chrome unavailable')

        # Should NOT raise
        Command().handle()

        # Subsequent steps still ran
        mock_large.assert_called_once()
        mock_remove.assert_called_once()
        mock_logs.assert_called_once()
        mock_visits.assert_called_once()
        # And an Error row captured the failure
        self.assertTrue(Error.objects.filter(
            message__contains='Selenium fetch failed'
        ).exists())


# =============================================================================
# send_push_notification
# =============================================================================


@patch('shorts.management.commands.fetch_shorts.DEBUG', False)
@patch('shorts.management.commands.fetch_shorts.messaging.send')
class SendPushNotificationTests(TestCase):
    def setUp(self):
        self.user = AppUser.objects.create(fcm_token='token-abc', version='v17')

    def test_no_token_means_no_send(self, mock_send):
        user = AppUser.objects.create(fcm_token=None, version='v17')
        Command.send_push_notification(user, ['TST 0.50%'])
        mock_send.assert_not_called()

    def test_invalid_user_means_no_send(self, mock_send):
        self.user.invalid = timezone.now()
        self.user.save()
        Command.send_push_notification(self.user, ['TST 0.50%'])
        mock_send.assert_not_called()

    def test_successful_send_increments_counter(self, mock_send):
        before = self.user.notifications_sent
        Command.send_push_notification(self.user, ['TST 0.50%'])
        self.user.refresh_from_db()
        self.assertEqual(self.user.notifications_sent, before + 1)
        mock_send.assert_called_once()

    def test_unregistered_error_marks_user_invalid(self, mock_send):
        mock_send.side_effect = UnregisteredError('gone')
        Command.send_push_notification(self.user, ['TST 0.50%'])
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.invalid)
        self.assertTrue(Error.objects.filter(message__contains="FCM token doesn't exist").exists())

    def test_invalid_argument_error_marks_user_invalid(self, mock_send):
        mock_send.side_effect = InvalidArgumentError('bad token')
        Command.send_push_notification(self.user, ['TST 0.50%'])
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.invalid)
        self.assertTrue(Error.objects.filter(message__contains='FCM token is invalid').exists())

    def test_v17_includes_loc_args_with_joined_stocks(self, mock_send):
        Command.send_push_notification(self.user, ['TST 0.50%', 'BBB 0.30%'])
        sent_message = mock_send.call_args.args[0]
        loc_args = sent_message.apns.payload.aps.alert.loc_args
        self.assertEqual(loc_args, ['TST 0.50%, BBB 0.30%'])

    def test_old_version_omits_loc_args(self, mock_send):
        old_user = AppUser.objects.create(fcm_token='t', version='v10')
        Command.send_push_notification(old_user, ['TST 0.50%'])
        sent_message = mock_send.call_args.args[0]
        self.assertIsNone(sent_message.apns.payload.aps.alert.loc_args)

    def test_v15_sets_badge_to_one_v10_keeps_zero(self, mock_send):
        v15_user = AppUser.objects.create(fcm_token='t15', version='v15')
        v10_user = AppUser.objects.create(fcm_token='t10', version='v10')

        Command.send_push_notification(v15_user, ['TST 0.50%'])
        Command.send_push_notification(v10_user, ['TST 0.50%'])

        first_msg = mock_send.call_args_list[0].args[0]
        second_msg = mock_send.call_args_list[1].args[0]
        self.assertEqual(first_msg.apns.payload.aps.badge, 1)
        self.assertEqual(second_msg.apns.payload.aps.badge, 0)
