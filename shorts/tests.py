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


class GetOrCreateStocksBulkTests(TestCase):
    def test_returns_existing_stocks_unmodified(self):
        existing = make_stock(code='DK1', name='Original Name', symbol='ORIG')
        result = Command.get_or_create_stocks_bulk([('DK1', 'Some Other Name')])
        self.assertIn('DK1', result)
        self.assertEqual(result['DK1'].pk, existing.pk)
        self.assertEqual(result['DK1'].name, 'Original Name')
        self.assertEqual(result['DK1'].symbol, 'ORIG')

    def test_creates_new_stock_with_symbol_truncated_to_20_chars(self):
        long_name = 'A Very Very Very Long Company Name A/S'
        result = Command.get_or_create_stocks_bulk([('DK_NEW', long_name)])
        stock = result['DK_NEW']
        self.assertEqual(stock.code, 'DK_NEW')
        self.assertEqual(stock.name, long_name)
        self.assertEqual(stock.symbol, long_name[:20])
        self.assertEqual(len(stock.symbol), 20)
        self.assertTrue(Stock.objects.filter(code='DK_NEW').exists())

    def test_mixed_existing_and_new_in_one_call(self):
        make_stock(code='DK1', name='Existing', symbol='EX')
        result = Command.get_or_create_stocks_bulk([
            ('DK1', 'Name from feed'),
            ('DK2', 'Brand New A/S'),
        ])
        self.assertEqual(set(result.keys()), {'DK1', 'DK2'})
        self.assertEqual(result['DK1'].name, 'Existing')
        self.assertEqual(result['DK2'].name, 'Brand New A/S')

    def test_duplicate_codes_in_input_are_deduped(self):
        result = Command.get_or_create_stocks_bulk([
            ('DK_DUP', 'First Name'),
            ('DK_DUP', 'Second Name'),
        ])
        self.assertEqual(Stock.objects.filter(code='DK_DUP').count(), 1)
        self.assertEqual(result['DK_DUP'].name, 'First Name')

    def test_empty_input_returns_empty_dict(self):
        self.assertEqual(Command.get_or_create_stocks_bulk([]), {})

    def test_uses_bounded_query_count(self):
        make_stock(code='EXIST1')
        make_stock(code='EXIST2')
        with self.assertNumQueries(2):  # in_bulk + bulk_create
            Command.get_or_create_stocks_bulk([
                ('EXIST1', 'A'),
                ('EXIST2', 'B'),
                ('NEW1', 'New One'),
                ('NEW2', 'New Two'),
            ])


class GetPrevValueForLargeSellingTests(TestCase):
    def setUp(self):
        self.stock = make_stock(code='DK1')
        self.seller = ShortSeller.objects.create(name='Acme LP')

    def test_returns_none_when_no_prior_record(self):
        published = CPH.localize(datetime(2026, 4, 24, 10, 0))
        result = Command.get_prev_value_for_large_selling(None, published)
        self.assertIsNone(result)

    def test_same_date_returns_existing_prev_value(self):
        existing = LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=self.seller,
            name='Acme LP',
            business_id='',
            value=1.20,
            date=date(2026, 4, 24),
            prev_value=0.95,
        )
        published = CPH.localize(datetime(2026, 4, 24, 12, 0))
        result = Command.get_prev_value_for_large_selling(existing, published)
        # Same publication date as record → keep the existing prev_value (don't shift)
        self.assertEqual(result, 0.95)

    def test_different_date_returns_existing_value_as_new_prev(self):
        existing = LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=self.seller,
            name='Acme LP',
            business_id='',
            value=1.20,
            date=date(2026, 4, 23),
            prev_value=0.95,
        )
        published = CPH.localize(datetime(2026, 4, 24, 12, 0))
        result = Command.get_prev_value_for_large_selling(existing, published)
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


@patch.object(Command, 'send_push_notifications')
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

        # send_push_notifications is called once with a dict keyed by user.
        self.assertEqual(mock_push.call_count, 1)
        called_dict = mock_push.call_args.args[0]
        self.assertIn(user, called_dict)
        self.assertEqual(called_dict[user], ['TST 0.50%'])

    def test_app_user_not_following_is_not_notified(self, mock_push):
        stock_a = make_stock(code='DK1', symbol='AAA')
        stock_b = make_stock(code='DK2', symbol='BBB')
        user = AppUser.objects.create(fcm_token='token-1')
        user.stocks.add(stock_b)  # only follows B

        Command.fetch_short_positions([self._build(stock_a, 0.30)])

        # send_push_notifications is always called once at the end, but the
        # dispatched dict must be empty since no followed stock changed.
        self.assertEqual(mock_push.call_count, 1)
        self.assertEqual(mock_push.call_args.args[0], {})

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

    def test_closure_path_handles_duplicate_positions_at_same_timestamp(self, mock_push):
        """
        A stock can have two ShortPosition rows with the EXACT same timestamp
        — that is precisely why remove_duplicate_positions() exists. Such a
        stock surfaces twice in distinct_stocks (the latest-per-stock filter
        is timestamp-based, so two rows at max_timestamp both pass through).
        When that stock is not in today's feed, the closure branch must
        complete cleanly and produce exactly one chart row for today.
        """
        stock = make_stock(code='DK_DUP', symbol='DUP')
        earlier = self.now - timedelta(hours=1)
        # Two rows with the SAME timestamp.
        ShortPosition.objects.create(stock=stock, value=0.5, timestamp=earlier)
        ShortPosition.objects.create(stock=stock, value=0.5, timestamp=earlier)

        # Empty feed → closure path runs for stock DK_DUP.
        Command.fetch_short_positions([])

        # Exactly one chart row for today, value=0.0. (No double-create or
        # same-instance-in-both-bulk-lists corruption.)
        today_charts = ShortPositionChart.objects.filter(
            stock=stock, date=self.now.date()
        )
        self.assertEqual(today_charts.count(), 1)
        self.assertAlmostEqual(today_charts.first().value, 0.0)

    def test_new_positions_path_handles_duplicate_entries_for_same_stock(self, mock_push):
        """
        If the parser ever yields two entries for the same stock in one batch
        (rare but possible — e.g. scraper returning a row twice), the chart
        upsert in the new-positions branch must still produce exactly one
        chart row for today, and that row must reflect the LATEST value seen
        for the stock in the batch.
        """
        stock = make_stock(code='DK_DUP', symbol='DUP')
        first_entry = self._build(stock, 0.40, timestamp=self.now)
        second_entry = self._build(stock, 0.55, timestamp=self.now)

        Command.fetch_short_positions([first_entry, second_entry])

        today_charts = ShortPositionChart.objects.filter(
            stock=stock, date=self.now.date()
        )
        self.assertEqual(today_charts.count(), 1)
        # The chart should reflect the latest value processed for this stock.
        self.assertAlmostEqual(today_charts.first().value, 0.55)

    def test_closure_chart_upsert_safe_when_bulk_create_does_not_backfill_pk(self, mock_push):
        """
        Production MySQL does NOT backfill primary keys on instances passed
        to bulk_create (unlike SQLite/Postgres). If the closure path ever
        puts the same chart instance into BOTH the bulk_create and
        bulk_update lists, the subsequent bulk_update call will raise
        ValueError("All bulk_update() objects must have a primary key set.")
        on the pk=None instance.

        We simulate that backend behaviour here by stripping pks after
        bulk_create, so this regression is caught on SQLite too.
        """
        stock = make_stock(code='DK_DUP', symbol='DUP')
        earlier = self.now - timedelta(hours=1)
        # Two rows with identical timestamps → distinct_stocks returns the
        # stock twice → closure path iterates it twice.
        ShortPosition.objects.create(stock=stock, value=0.5, timestamp=earlier)
        ShortPosition.objects.create(stock=stock, value=0.5, timestamp=earlier)

        real_bulk_create = ShortPositionChart.objects.bulk_create

        def bulk_create_strip_pk(objs, *args, **kwargs):
            result = real_bulk_create(objs, *args, **kwargs)
            for obj in objs:
                obj.pk = None
            return result

        with mock.patch.object(
            ShortPositionChart.objects,
            'bulk_create',
            side_effect=bulk_create_strip_pk,
        ):
            # Must not raise.
            Command.fetch_short_positions([])

        today_charts = ShortPositionChart.objects.filter(
            stock=stock, date=self.now.date()
        )
        self.assertEqual(today_charts.count(), 1)
        self.assertAlmostEqual(today_charts.first().value, 0.0)

    def test_new_positions_chart_upsert_safe_when_bulk_create_does_not_backfill_pk(self, mock_push):
        """
        MySQL counterpart for the new-positions branch: two entries for the
        same stock in a single batch must not put the same chart instance
        into both bulk_create and bulk_update lists.
        """
        stock = make_stock(code='DK_DUP', symbol='DUP')
        first_entry = self._build(stock, 0.40, timestamp=self.now)
        second_entry = self._build(stock, 0.55, timestamp=self.now)

        real_bulk_create = ShortPositionChart.objects.bulk_create

        def bulk_create_strip_pk(objs, *args, **kwargs):
            result = real_bulk_create(objs, *args, **kwargs)
            for obj in objs:
                obj.pk = None
            return result

        with mock.patch.object(
            ShortPositionChart.objects,
            'bulk_create',
            side_effect=bulk_create_strip_pk,
        ):
            # Must not raise.
            Command.fetch_short_positions([first_entry, second_entry])

        today_charts = ShortPositionChart.objects.filter(
            stock=stock, date=self.now.date()
        )
        self.assertEqual(today_charts.count(), 1)
        self.assertAlmostEqual(today_charts.first().value, 0.55)


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
    def test_same_date_repush_preserves_prev_value(self, mock_post):
        """A re-publish on the same calendar day must keep the existing prev_value."""
        seller = ShortSeller.objects.create(name='Marshall Wace LLP')
        LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=seller,
            name='Marshall Wace LLP',
            business_id='',
            value=1.20,
            date=date(2026, 4, 24),
            prev_value=0.95,
        )

        mock_post.return_value = self._api_response([{
            'HeadlineColumn': (
                'Marshall Wace LLP holds a net short position of 1,30% in '
                'the share capital issued by Netcompany Group A/S'
            ),
            'IssuerColumn': 'Netcompany Group A/S',
            'PublicationDateColumn': '24-04-2026 14:00:00',
        }])

        self.cmd.fetch_large_short_selling()

        # Exactly one row remains for this (stock, seller_name)
        record = LargeShortSelling.objects.get(stock=self.stock, name='Marshall Wace LLP')
        # Value updated to today's number
        self.assertAlmostEqual(record.value, 1.30)
        # prev_value stays as the existing value (NOT shifted to 1.20)
        self.assertAlmostEqual(record.prev_value, 0.95)
        self.assertEqual(record.date, date(2026, 4, 24))

    @patch('shorts.management.commands.fetch_shorts.requests.post')
    def test_mixed_feed_creates_updates_and_deletes_in_one_call(self, mock_post):
        """A single feed run can simultaneously create new, update returning, and delete stale rows."""
        # Preload: one returning seller + one stale seller
        returning_seller = ShortSeller.objects.create(name='Marshall Wace LLP')
        stale_seller = ShortSeller.objects.create(name='Old Fund LP')
        LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=returning_seller,
            name='Marshall Wace LLP',
            business_id='',
            value=0.50,
            date=date(2026, 4, 23),
            prev_value=0.40,
        )
        LargeShortSelling.objects.create(
            stock=self.stock,
            short_seller=stale_seller,
            name='Old Fund LP',
            business_id='',
            value=0.60,
            date=date(2026, 4, 23),
        )

        # Feed: returning (with new value/date) + a brand-new seller; Old Fund LP missing
        mock_post.return_value = self._api_response([
            {
                'HeadlineColumn': (
                    'Marshall Wace LLP holds a net short position of 0,80% in '
                    'the share capital issued by Netcompany Group A/S'
                ),
                'IssuerColumn': 'Netcompany Group A/S',
                'PublicationDateColumn': '24-04-2026 12:00:00',
            },
            {
                'HeadlineColumn': (
                    'New Hedge LP holds a net short position of 0,55% in '
                    'the share capital issued by Netcompany Group A/S'
                ),
                'IssuerColumn': 'Netcompany Group A/S',
                'PublicationDateColumn': '24-04-2026 12:00:00',
            },
        ])

        self.cmd.fetch_large_short_selling()

        # Returning seller: row updated, prev_value carries the prior value (different date branch)
        returning = LargeShortSelling.objects.get(stock=self.stock, name='Marshall Wace LLP')
        self.assertAlmostEqual(returning.value, 0.80)
        self.assertAlmostEqual(returning.prev_value, 0.50)
        self.assertEqual(returning.date, date(2026, 4, 24))

        # New seller: row inserted with prev_value=None
        new_row = LargeShortSelling.objects.get(stock=self.stock, name='New Hedge LP')
        self.assertAlmostEqual(new_row.value, 0.55)
        self.assertIsNone(new_row.prev_value)

        # Stale seller: row deleted
        self.assertFalse(
            LargeShortSelling.objects.filter(name='Old Fund LP').exists()
        )

        # No extras
        self.assertEqual(LargeShortSelling.objects.count(), 2)

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

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_swallows_large_sellers_exceptions_and_continues(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        mock_driver.return_value = MagicMock()
        mock_large.side_effect = Exception('http boom')

        Command().handle()

        # remove_duplicate_positions and the rest still run
        mock_remove.assert_called_once()
        mock_logs.assert_called_once()
        mock_visits.assert_called_once()
        self.assertTrue(Error.objects.filter(
            message__contains='Large sellers fetch failed'
        ).exists())

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_only_invalidates_short_sellers_cache_when_selenium_fails(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        mock_driver.return_value = MagicMock()
        mock_selenium.side_effect = Exception('chrome unavailable')

        cache.set('short_positions_list', 'A', timeout=None)
        cache.set('short_sellers_list', 'B', timeout=None)
        cache.set('homepage_stats', 'C', timeout=None)
        cache.set('top_lists', 'D', timeout=None)

        Command().handle()

        # Only short_sellers_list is invalidated; the position-derived caches
        # stay because their underlying data was not refreshed.
        self.assertEqual(cache.get('short_positions_list'), 'A')
        self.assertIsNone(cache.get('short_sellers_list'))
        self.assertEqual(cache.get('homepage_stats'), 'C')
        self.assertEqual(cache.get('top_lists'), 'D')

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_only_invalidates_position_caches_when_large_sellers_fails(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        mock_driver.return_value = MagicMock()
        mock_large.side_effect = Exception('http boom')

        cache.set('short_positions_list', 'A', timeout=None)
        cache.set('short_sellers_list', 'B', timeout=None)
        cache.set('homepage_stats', 'C', timeout=None)
        cache.set('top_lists', 'D', timeout=None)

        Command().handle()

        self.assertIsNone(cache.get('short_positions_list'))
        self.assertEqual(cache.get('short_sellers_list'), 'B')
        self.assertIsNone(cache.get('homepage_stats'))
        self.assertIsNone(cache.get('top_lists'))

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_skips_cache_invalidation_when_both_fetches_fail(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        mock_driver.return_value = MagicMock()
        mock_selenium.side_effect = Exception('chrome unavailable')
        mock_large.side_effect = Exception('http boom')

        cache.set('short_positions_list', 'A', timeout=None)
        cache.set('short_sellers_list', 'B', timeout=None)
        cache.set('homepage_stats', 'C', timeout=None)
        cache.set('top_lists', 'D', timeout=None)

        Command().handle()

        # Nothing actually refreshed → no caches invalidated.
        self.assertEqual(cache.get('short_positions_list'), 'A')
        self.assertEqual(cache.get('short_sellers_list'), 'B')
        self.assertEqual(cache.get('homepage_stats'), 'C')
        self.assertEqual(cache.get('top_lists'), 'D')

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_skips_cache_invalidation_when_fetches_succeed_but_data_unchanged(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        # Both fetches return False — feed parsed cleanly but every row was a
        # no-op (already in DB). Caches must remain populated.
        mock_driver.return_value = MagicMock()
        mock_selenium.return_value = False
        mock_large.return_value = False

        cache.set('short_positions_list', 'A', timeout=None)
        cache.set('short_sellers_list', 'B', timeout=None)
        cache.set('homepage_stats', 'C', timeout=None)
        cache.set('top_lists', 'D', timeout=None)

        Command().handle()

        self.assertEqual(cache.get('short_positions_list'), 'A')
        self.assertEqual(cache.get('short_sellers_list'), 'B')
        self.assertEqual(cache.get('homepage_stats'), 'C')
        self.assertEqual(cache.get('top_lists'), 'D')

    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_invalidates_only_short_sellers_when_only_large_changed(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits
    ):
        # Selenium succeeded but the feed contained no new positions; large
        # sellers fetch did mutate data. Only the short_sellers cache should
        # be wiped.
        mock_driver.return_value = MagicMock()
        mock_selenium.return_value = False
        mock_large.return_value = True

        cache.set('short_positions_list', 'A', timeout=None)
        cache.set('short_sellers_list', 'B', timeout=None)
        cache.set('homepage_stats', 'C', timeout=None)
        cache.set('top_lists', 'D', timeout=None)

        Command().handle()

        self.assertEqual(cache.get('short_positions_list'), 'A')
        self.assertIsNone(cache.get('short_sellers_list'))
        self.assertEqual(cache.get('homepage_stats'), 'C')
        self.assertEqual(cache.get('top_lists'), 'D')

    @patch('shorts.management.commands.fetch_shorts.invalidate_detail_caches')
    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_bumps_detail_cache_when_short_positions_changed(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits, mock_invalidate
    ):
        mock_driver.return_value = MagicMock()
        mock_selenium.return_value = True
        mock_large.return_value = False

        Command().handle()

        mock_invalidate.assert_called_once()

    @patch('shorts.management.commands.fetch_shorts.invalidate_detail_caches')
    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_bumps_detail_cache_when_large_sellers_changed(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits, mock_invalidate
    ):
        mock_driver.return_value = MagicMock()
        mock_selenium.return_value = False
        mock_large.return_value = True

        Command().handle()

        mock_invalidate.assert_called_once()

    @patch('shorts.management.commands.fetch_shorts.invalidate_detail_caches')
    @patch('shorts.management.commands.fetch_shorts.process_visits')
    @patch('shorts.management.commands.fetch_shorts.delete_old_logs')
    @patch.object(Command, 'remove_duplicate_positions')
    @patch.object(Command, 'fetch_large_short_selling')
    @patch.object(Command, 'fetch_short_positions_selenium')
    @patch.object(Command, '_get_webdriver')
    def test_handle_does_not_bump_detail_cache_when_neither_changed(
        self, mock_driver, mock_selenium, mock_large, mock_remove, mock_logs, mock_visits, mock_invalidate
    ):
        mock_driver.return_value = MagicMock()
        mock_selenium.return_value = False
        mock_large.return_value = False

        Command().handle()

        mock_invalidate.assert_not_called()


# =============================================================================
# Detail-view caching — versioned key + invalidate_detail_caches()
# =============================================================================


class DetailCacheTests(TestCase):
    """Detail responses are cached under detail_v{version}_<code>. Bumping the
    version makes every previously-cached detail key unreachable.
    """

    def setUp(self):
        cache.clear()

    def test_invalidate_detail_caches_increments_version_from_unset(self):
        from shorts.views import invalidate_detail_caches, DETAIL_CACHE_VERSION_KEY

        self.assertIsNone(cache.get(DETAIL_CACHE_VERSION_KEY))
        invalidate_detail_caches()
        self.assertEqual(cache.get(DETAIL_CACHE_VERSION_KEY), 1)

    def test_invalidate_detail_caches_increments_existing_version(self):
        from shorts.views import invalidate_detail_caches, DETAIL_CACHE_VERSION_KEY

        cache.set(DETAIL_CACHE_VERSION_KEY, 7, timeout=None)
        invalidate_detail_caches()
        self.assertEqual(cache.get(DETAIL_CACHE_VERSION_KEY), 8)

    def test_detail_cache_key_uses_current_version(self):
        from shorts.views import _detail_cache_key, DETAIL_CACHE_VERSION_KEY

        # No version set → defaults to 0
        self.assertEqual(_detail_cache_key('DK1'), 'detail_v0_DK1')

        cache.set(DETAIL_CACHE_VERSION_KEY, 3, timeout=None)
        self.assertEqual(_detail_cache_key('DK1'), 'detail_v3_DK1')

    def test_old_version_key_becomes_unreachable_after_bump(self):
        from shorts.views import invalidate_detail_caches, _detail_cache_key

        # Cache something under v0
        key_v0 = _detail_cache_key('DK1')
        cache.set(key_v0, 'old_payload', timeout=None)
        self.assertEqual(cache.get(key_v0), 'old_payload')

        # Bump version → readers compute a new key and miss
        invalidate_detail_caches()
        key_v1 = _detail_cache_key('DK1')
        self.assertNotEqual(key_v0, key_v1)
        self.assertIsNone(cache.get(key_v1))


# =============================================================================
# _build_push_message — message-shape tests (pure, no network)
# =============================================================================


class BuildPushMessageTests(TestCase):
    """The Message returned by _build_push_message is what gets handed to FCM,
    so its structure must match what the iOS clients expect on each version.
    """

    def setUp(self):
        self.user = AppUser.objects.create(fcm_token='token-abc', version='v17')

    def test_no_token_returns_none(self):
        user = AppUser.objects.create(fcm_token=None, version='v17')
        self.assertIsNone(Command._build_push_message(user, ['TST 0.50%']))

    def test_invalid_user_returns_none(self):
        self.user.invalid = timezone.now()
        self.user.save()
        self.assertIsNone(Command._build_push_message(self.user, ['TST 0.50%']))

    def test_v17_includes_loc_args_with_joined_stocks(self):
        message = Command._build_push_message(self.user, ['TST 0.50%', 'BBB 0.30%'])
        self.assertEqual(message.apns.payload.aps.alert.loc_args, ['TST 0.50%, BBB 0.30%'])

    def test_old_version_omits_loc_args(self):
        old_user = AppUser.objects.create(fcm_token='t', version='v10')
        message = Command._build_push_message(old_user, ['TST 0.50%'])
        self.assertIsNone(message.apns.payload.aps.alert.loc_args)

    def test_v15_sets_badge_to_one_v10_keeps_zero(self):
        v15_user = AppUser.objects.create(fcm_token='t15', version='v15')
        v10_user = AppUser.objects.create(fcm_token='t10', version='v10')
        v15_msg = Command._build_push_message(v15_user, ['TST 0.50%'])
        v10_msg = Command._build_push_message(v10_user, ['TST 0.50%'])
        self.assertEqual(v15_msg.apns.payload.aps.badge, 1)
        self.assertEqual(v10_msg.apns.payload.aps.badge, 0)


# =============================================================================
# send_push_notifications — batch dispatch
# =============================================================================


def _make_send_response(success, exception=None):
    """Build a stand-in for firebase_admin.messaging.SendResponse."""
    r = MagicMock()
    r.success = success
    r.exception = exception
    return r


def _make_batch_response(responses):
    br = MagicMock()
    br.responses = list(responses)
    br.success_count = sum(1 for r in responses if r.success)
    br.failure_count = sum(1 for r in responses if not r.success)
    return br


@patch('shorts.management.commands.fetch_shorts.DEBUG', False)
@patch('shorts.management.commands.fetch_shorts.messaging.send_each')
class SendPushNotificationsTests(TestCase):
    """The batch dispatcher: chunks of 500, per-user error handling, counters."""

    def setUp(self):
        self.user = AppUser.objects.create(fcm_token='token-abc', version='v17')

    def test_skips_send_when_no_sendable_users(self, mock_send_each):
        user_no_token = AppUser.objects.create(fcm_token=None, version='v17')
        Command.send_push_notifications({user_no_token: ['TST 0.50%']})
        mock_send_each.assert_not_called()

    def test_empty_dict_does_not_call_fcm(self, mock_send_each):
        Command.send_push_notifications({})
        mock_send_each.assert_not_called()

    def test_successful_send_increments_counter(self, mock_send_each):
        mock_send_each.return_value = _make_batch_response([_make_send_response(True)])
        before = self.user.notifications_sent

        Command.send_push_notifications({self.user: ['TST 0.50%']})

        self.user.refresh_from_db()
        self.assertEqual(self.user.notifications_sent, before + 1)
        mock_send_each.assert_called_once()
        # exactly one Message handed to FCM
        sent_messages = mock_send_each.call_args.args[0]
        self.assertEqual(len(sent_messages), 1)

    def test_unregistered_error_marks_user_invalid(self, mock_send_each):
        mock_send_each.return_value = _make_batch_response([
            _make_send_response(False, UnregisteredError('gone')),
        ])

        Command.send_push_notifications({self.user: ['TST 0.50%']})

        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.invalid)
        self.assertTrue(Error.objects.filter(message__contains="FCM token doesn't exist").exists())
        # Counter NOT incremented for failed sends
        self.assertEqual(self.user.notifications_sent, 0)

    def test_invalid_argument_error_marks_user_invalid(self, mock_send_each):
        mock_send_each.return_value = _make_batch_response([
            _make_send_response(False, InvalidArgumentError('bad token')),
        ])

        Command.send_push_notifications({self.user: ['TST 0.50%']})

        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.invalid)
        self.assertTrue(Error.objects.filter(message__contains='FCM token is invalid').exists())

    def test_other_exception_logs_generic_error_but_does_not_mark_invalid(self, mock_send_each):
        mock_send_each.return_value = _make_batch_response([
            _make_send_response(False, RuntimeError('transient FCM hiccup')),
        ])

        Command.send_push_notifications({self.user: ['TST 0.50%']})

        self.user.refresh_from_db()
        # Generic transient errors should NOT permanently invalidate the user
        self.assertIsNone(self.user.invalid)
        self.assertTrue(Error.objects.filter(message__contains='FCM send failed').exists())

    def test_partial_failure_only_affects_failing_user(self, mock_send_each):
        good_user = AppUser.objects.create(fcm_token='good', version='v17')
        bad_user = AppUser.objects.create(fcm_token='bad', version='v17')

        # Order of dict insertion is preserved in 3.7+, so good comes first.
        mock_send_each.return_value = _make_batch_response([
            _make_send_response(True),
            _make_send_response(False, UnregisteredError('gone')),
        ])

        Command.send_push_notifications({
            good_user: ['TST 0.50%'],
            bad_user: ['TST 0.50%'],
        })

        good_user.refresh_from_db()
        bad_user.refresh_from_db()
        self.assertEqual(good_user.notifications_sent, 1)
        self.assertIsNone(good_user.invalid)
        self.assertEqual(bad_user.notifications_sent, 0)
        self.assertIsNotNone(bad_user.invalid)

    def test_batches_split_when_more_than_500_messages(self, mock_send_each):
        # 501 users → 1 batch of 500 + 1 batch of 1 → two send_each calls.
        users = [
            AppUser.objects.create(fcm_token=f't-{i}', version='v17')
            for i in range(501)
        ]
        # Each call returns a fresh BatchResponse sized to the chunk.
        def fake_send_each(messages):
            return _make_batch_response([_make_send_response(True) for _ in messages])
        mock_send_each.side_effect = fake_send_each

        Command.send_push_notifications({u: ['TST 0.50%'] for u in users})

        self.assertEqual(mock_send_each.call_count, 2)
        first_chunk = mock_send_each.call_args_list[0].args[0]
        second_chunk = mock_send_each.call_args_list[1].args[0]
        self.assertEqual(len(first_chunk), 500)
        self.assertEqual(len(second_chunk), 1)


@patch('shorts.management.commands.fetch_shorts.DEBUG', True)
@patch('shorts.management.commands.fetch_shorts.messaging.send_each')
class SendPushNotificationsDebugModeTests(TestCase):
    """In DEBUG, send_each must NOT be called, but counters still tick on
    sendable users so dev runs see the same DB side-effects as prod success."""

    def test_debug_mode_skips_network_but_increments_counter(self, mock_send_each):
        user = AppUser.objects.create(fcm_token='token-abc', version='v17')
        Command.send_push_notifications({user: ['TST 0.50%']})
        user.refresh_from_db()
        self.assertEqual(user.notifications_sent, 1)
        mock_send_each.assert_not_called()
