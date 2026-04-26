"""
Tests for shorts.management.commands.fetch_closing_prices.

Behavioural tests that pin down the *current* observable behaviour of the
command so any future refactor (auto_adjust handling, batching, dropping the
forward-fill of volume, etc.) can be validated against them.

Coverage:
  * create_missing_chart_values — backfilling value=0 chart entries from
    2023-11-06 up to the earliest existing chart row (or today)
  * fill_initial_missing_data   — the >10 / >186-for-SVITZR thresholds and
    the per-row update_or_create
  * update_today_price_volume   — single-row update keyed on today's date
  * did_a_split_occur           — the 10% threshold and the destructive
    close/volume wipe
  * fill_holes_in_chart_values  — forward-fill of close+volume
  * handle()                    — skip-list, per-stock try/except, pipeline
                                  ordering, yf.download invocation

All yfinance interactions are mocked. No real network calls.
"""

from datetime import datetime, date, timedelta, time
from unittest.mock import patch

import pandas as pd
import pytz
from django.test import TestCase
from django.utils import timezone

from errors.models import Error
from shorts.models import Stock, ShortPositionChart
from shorts.management.commands.fetch_closing_prices import Command


CPH = pytz.timezone('Europe/Copenhagen')


def make_stock(code='DK1', name='Test A/S', symbol='TST', active=True):
    return Stock.objects.create(code=code, name=name, symbol=symbol, active=active)


def make_chart(stock, d, value=0.0, close=None, volume=None, ts=None):
    if ts is None:
        naive = datetime.combine(d, time(23, 45))
        ts = timezone.make_aware(naive, timezone.get_current_timezone())
    return ShortPositionChart.objects.create(
        stock=stock, date=d, value=value, close=close, volume=volume, timestamp=ts
    )


def make_yf_data(rows, ticker=None):
    """
    Build a DataFrame mimicking yfinance v0.2 output.

    rows: list of (date_or_str, close, high, low, open, volume).

    Default (ticker=None) → flat columns ['Close','High','Low','Open','Volume'],
    matching what the helpers see *after* handle() flattens the MultiIndex.

    Pass ticker='X.CO' to get MultiIndex columns matching the raw yf.download
    return value — used by handle() tests that mock yf.download.
    """
    if ticker is not None:
        columns = pd.MultiIndex.from_tuples([
            ('Close', ticker),
            ('High', ticker),
            ('Low', ticker),
            ('Open', ticker),
            ('Volume', ticker),
        ])
    else:
        columns = ['Close', 'High', 'Low', 'Open', 'Volume']
    index = pd.DatetimeIndex([
        r[0] if isinstance(r[0], pd.Timestamp) else pd.Timestamp(r[0])
        for r in rows
    ])
    body = [list(r[1:]) for r in rows]
    return pd.DataFrame(body, index=index, columns=columns)


# =============================================================================
# create_missing_chart_values
# =============================================================================


class CreateMissingChartValuesTests(TestCase):
    """Backfills value=0 chart entries from 2023-11-06 up to the earliest
    existing chart row, or up to today if no rows exist."""

    def test_no_op_when_first_chart_matches_start_date(self):
        stock = make_stock()
        make_chart(stock, date(2023, 11, 6))
        Command.create_missing_chart_values(stock)
        self.assertEqual(ShortPositionChart.objects.filter(stock=stock).count(), 1)

    def test_no_op_when_first_chart_predates_start_date(self):
        stock = make_stock()
        make_chart(stock, date(2023, 11, 1))
        Command.create_missing_chart_values(stock)
        self.assertEqual(ShortPositionChart.objects.filter(stock=stock).count(), 1)

    def test_fills_gap_between_start_date_and_first_chart(self):
        stock = make_stock()
        first = make_chart(stock, date(2023, 11, 10))
        Command.create_missing_chart_values(stock)
        # 11-06, 11-07, 11-08, 11-09 (4 inserted) + the original = 5
        charts = ShortPositionChart.objects.filter(stock=stock).order_by('date')
        self.assertEqual(charts.count(), 5)
        self.assertEqual(charts.first().date, date(2023, 11, 6))
        self.assertEqual(charts.last().date, date(2023, 11, 10))
        # Filled entries have value=0
        for c in charts.exclude(pk=first.pk):
            self.assertEqual(c.value, 0)
        # An Error row was logged (used as a warning channel)
        self.assertTrue(Error.objects.filter(
            message__contains='create_missing_chart_values'
        ).exists())

    def test_raises_when_stock_has_no_existing_charts(self):
        """Latent bug: when there are zero chart rows, the warning f-string
        unconditionally evaluates `first.date` even though `first` is None.

        In production this path is never hit because every stock already has
        chart rows from fetch_shorts / update_chart, but the failure mode is
        worth pinning — pre-fetch should always seed at least one chart row.
        """
        stock = make_stock()
        with self.assertRaises(AttributeError):
            Command.create_missing_chart_values(stock)

    def test_filled_entries_have_2345_local_timestamp(self):
        stock = make_stock()
        make_chart(stock, date(2023, 11, 8))
        Command.create_missing_chart_values(stock)
        filled = ShortPositionChart.objects.filter(stock=stock).exclude(date=date(2023, 11, 8))
        self.assertGreater(filled.count(), 0)
        for c in filled:
            local_ts = timezone.localtime(c.timestamp)
            self.assertEqual(local_ts.hour, 23)
            self.assertEqual(local_ts.minute, 45)

    def test_does_not_overwrite_existing_intermediate_entries(self):
        """A pre-existing entry inside the gap is left alone but logs an error."""
        stock = make_stock()
        # Edge case: there's a row inside the gap (shouldn't happen since
        # the loop ends at first.date, but the code defensively guards it)
        make_chart(stock, date(2023, 11, 10), close=99.0)
        original = ShortPositionChart.objects.get(stock=stock, date=date(2023, 11, 10))
        Command.create_missing_chart_values(stock)
        # The pre-existing row was not overwritten
        original.refresh_from_db()
        self.assertAlmostEqual(original.close, 99.0)


# =============================================================================
# fill_initial_missing_data
# =============================================================================


class FillInitialMissingDataTests(TestCase):
    def test_no_op_when_below_threshold_for_non_svitzr(self):
        stock = make_stock(symbol='TST')
        for i in range(10):  # 10 is NOT > 10 → skip
            make_chart(stock, date(2024, 1, 1) + timedelta(days=i), close=None)
        data = make_yf_data([
            (date(2024, 1, 1) + timedelta(days=i), 100.0 + i, 105, 99, 101, 1000)
            for i in range(10)
        ])
        Command.fill_initial_missing_data(stock, data)
        self.assertEqual(
            ShortPositionChart.objects.filter(stock=stock, close__isnull=False).count(),
            0,
        )

    def test_fills_when_count_above_10_for_non_svitzr(self):
        stock = make_stock(symbol='TST')
        for i in range(11):
            make_chart(stock, date(2024, 1, 1) + timedelta(days=i), close=None)
        data = make_yf_data([
            (date(2024, 1, 1) + timedelta(days=i), 100.0 + i, 105, 99, 101, 1000 + i)
            for i in range(11)
        ])
        Command.fill_initial_missing_data(stock, data)
        for i in range(11):
            row = ShortPositionChart.objects.get(
                stock=stock, date=date(2024, 1, 1) + timedelta(days=i)
            )
            self.assertAlmostEqual(row.close, 100.0 + i)
            self.assertEqual(row.volume, 1000 + i)
        self.assertTrue(Error.objects.filter(
            message__contains='fill_initial_missing_data'
        ).exists())

    def test_svitzr_above_186_threshold_fills(self):
        stock = make_stock(code='SVITZR_CODE', symbol='SVITZR')
        for i in range(187):
            make_chart(stock, date(2024, 1, 1) + timedelta(days=i), close=None)
        data = make_yf_data([
            (date(2024, 1, 1), 100.0, 105, 99, 101, 1000),
        ])
        Command.fill_initial_missing_data(stock, data)
        row = ShortPositionChart.objects.get(stock=stock, date=date(2024, 1, 1))
        self.assertAlmostEqual(row.close, 100.0)
        self.assertEqual(row.volume, 1000)

    def test_svitzr_at_186_threshold_skips(self):
        stock = make_stock(code='SVITZR_CODE', symbol='SVITZR')
        for i in range(186):  # 186 is NOT > 186 → skip
            make_chart(stock, date(2024, 1, 1) + timedelta(days=i), close=None)
        data = make_yf_data([
            (date(2024, 1, 1), 100.0, 105, 99, 101, 1000),
        ])
        Command.fill_initial_missing_data(stock, data)
        self.assertEqual(
            ShortPositionChart.objects.filter(stock=stock, close__isnull=False).count(),
            0,
        )

    def test_close_is_rounded_to_two_decimals(self):
        stock = make_stock(symbol='TST')
        for i in range(11):
            make_chart(stock, date(2024, 1, 1) + timedelta(days=i), close=None)
        rows = [(date(2024, 1, 1), 99.999, 100, 99, 100, 1000)]
        rows += [
            (date(2024, 1, 1) + timedelta(days=i), 100.0, 100, 99, 100, 1000)
            for i in range(1, 11)
        ]
        data = make_yf_data(rows)
        Command.fill_initial_missing_data(stock, data)
        row = ShortPositionChart.objects.get(stock=stock, date=date(2024, 1, 1))
        self.assertAlmostEqual(row.close, 100.0)  # 99.999 → 100.00

    def test_per_row_exception_does_not_break_loop(self):
        stock = make_stock(symbol='TST')
        for i in range(11):
            make_chart(stock, date(2024, 1, 1) + timedelta(days=i), close=None)
        data = make_yf_data([
            (date(2024, 1, 1) + timedelta(days=i), 100.0 + i, 105, 99, 101, 1000)
            for i in range(11)
        ])
        original = ShortPositionChart.objects.update_or_create
        call_state = {'n': 0}

        def maybe_fail(*args, **kwargs):
            call_state['n'] += 1
            if call_state['n'] == 3:
                raise RuntimeError('boom')
            return original(*args, **kwargs)

        with patch.object(
            ShortPositionChart.objects, 'update_or_create', side_effect=maybe_fail
        ):
            Command.fill_initial_missing_data(stock, data)

        # 10 of 11 succeeded; one was silently skipped
        self.assertEqual(
            ShortPositionChart.objects.filter(stock=stock, close__isnull=False).count(),
            10,
        )


# =============================================================================
# update_today_price_volume
# =============================================================================


class UpdateTodayPriceVolumeTests(TestCase):
    def test_updates_close_and_volume_for_today(self):
        stock = make_stock()
        today = date.today()
        chart = make_chart(stock, today, close=None, volume=None)
        data = make_yf_data([(today, 123.456, 130, 120, 125, 5000)])
        Command.update_today_price_volume(data, stock)
        chart.refresh_from_db()
        self.assertAlmostEqual(chart.close, 123.46)  # rounded to 2dp
        self.assertEqual(chart.volume, 5000)

    def test_does_nothing_when_no_chart_row_for_today(self):
        stock = make_stock()
        # No chart row exists for today; this should not crash or insert.
        data = make_yf_data([(date.today(), 100, 100, 100, 100, 1000)])
        Command.update_today_price_volume(data, stock)
        self.assertEqual(ShortPositionChart.objects.filter(stock=stock).count(), 0)

    def test_only_updates_today_not_other_dates(self):
        stock = make_stock()
        today = date.today()
        yesterday = today - timedelta(days=1)
        chart_today = make_chart(stock, today, close=None, volume=None)
        chart_yest = make_chart(stock, yesterday, close=10.0, volume=100)
        data = make_yf_data([
            (yesterday, 50.0, 60, 40, 55, 200),
            (today, 99.0, 100, 90, 95, 1000),
        ])
        Command.update_today_price_volume(data, stock)
        chart_today.refresh_from_db()
        chart_yest.refresh_from_db()
        self.assertAlmostEqual(chart_today.close, 99.0)
        self.assertAlmostEqual(chart_yest.close, 10.0)  # untouched
        self.assertEqual(chart_yest.volume, 100)        # untouched

    def test_silently_swallows_exceptions(self):
        stock = make_stock()
        # Empty DataFrame → tail(1).iloc[0] raises; must not propagate.
        Command.update_today_price_volume(pd.DataFrame(), stock)


# =============================================================================
# did_a_split_occur
# =============================================================================


class DidASplitOccurTests(TestCase):
    def test_no_op_when_no_prev_chart_row(self):
        stock = make_stock()
        today = date.today()
        yesterday = today - timedelta(days=1)
        # No chart entries at all
        data = make_yf_data([
            (yesterday, 100, 100, 100, 100, 1000),
            (today,     105, 100, 100, 100, 1000),
        ])
        Command.did_a_split_occur(stock, data)
        self.assertFalse(
            Error.objects.filter(message__contains='did_a_split_occur').exists()
        )

    def test_no_op_when_prev_close_is_none(self):
        stock = make_stock()
        today = date.today()
        yesterday = today - timedelta(days=1)
        make_chart(stock, yesterday, close=None)
        data = make_yf_data([
            (yesterday, 100, 100, 100, 100, 1000),
            (today,     200, 100, 100, 100, 1000),  # 100% diff but skipped
        ])
        Command.did_a_split_occur(stock, data)
        self.assertFalse(
            Error.objects.filter(message__contains='did_a_split_occur').exists()
        )

    def test_within_10_percent_no_wipe(self):
        stock = make_stock()
        today = date.today()
        yesterday = today - timedelta(days=1)
        make_chart(stock, yesterday, close=100.0, volume=1000)
        data = make_yf_data([
            (yesterday, 100, 100, 100, 100, 1000),
            (today,     105, 100, 100, 100, 1000),  # 5% diff
        ])
        Command.did_a_split_occur(stock, data)
        chart = ShortPositionChart.objects.get(stock=stock, date=yesterday)
        self.assertAlmostEqual(chart.close, 100.0)
        self.assertEqual(chart.volume, 1000)

    def test_above_10_percent_wipes_close_and_volume_for_whole_stock(self):
        stock = make_stock()
        today = date.today()
        yesterday = today - timedelta(days=1)
        day_before = today - timedelta(days=2)
        make_chart(stock, yesterday, close=100.0, volume=1000)
        make_chart(stock, day_before, close=99.0, volume=900)
        data = make_yf_data([
            (yesterday, 100, 100, 100, 100, 1000),
            (today,     120, 100, 100, 100, 1000),  # 20% diff
        ])
        Command.did_a_split_occur(stock, data)
        for chart in ShortPositionChart.objects.filter(stock=stock):
            self.assertIsNone(chart.close)
            self.assertIsNone(chart.volume)
        self.assertTrue(
            Error.objects.filter(message__contains='did_a_split_occur').exists()
        )

    def test_does_not_wipe_other_stocks(self):
        a = make_stock(code='A', symbol='A_S')
        b = make_stock(code='B', symbol='B_S')
        today = date.today()
        yesterday = today - timedelta(days=1)
        make_chart(a, yesterday, close=100.0, volume=1000)
        make_chart(b, yesterday, close=50.0, volume=500)
        data = make_yf_data([
            (yesterday, 100, 100, 100, 100, 1000),
            (today,     150, 100, 100, 100, 1000),  # 50% diff for stock a
        ])
        Command.did_a_split_occur(a, data)
        chart_b = ShortPositionChart.objects.get(stock=b, date=yesterday)
        self.assertAlmostEqual(chart_b.close, 50.0)
        self.assertEqual(chart_b.volume, 500)

    def test_silently_swallows_exceptions(self):
        stock = make_stock()
        # Empty DataFrame → tail(2).index.date raises AttributeError
        Command.did_a_split_occur(stock, pd.DataFrame())


# =============================================================================
# fill_holes_in_chart_values
# =============================================================================


class FillHolesInChartValuesTests(TestCase):
    def test_forward_fills_close_and_volume(self):
        stock = make_stock()
        d1 = date(2024, 1, 1)
        make_chart(stock, d1, close=100.0, volume=1000)
        make_chart(stock, d1 + timedelta(days=1), close=None, volume=None)
        make_chart(stock, d1 + timedelta(days=2), close=None, volume=None)

        Command.fill_holes_in_chart_values(stock)

        for offset in (1, 2):
            c = ShortPositionChart.objects.get(stock=stock, date=d1 + timedelta(days=offset))
            self.assertAlmostEqual(c.close, 100.0)
            self.assertEqual(c.volume, 1000)

    def test_first_record_with_none_is_left_alone(self):
        stock = make_stock()
        d1 = date(2024, 1, 1)
        make_chart(stock, d1, close=None, volume=None)
        make_chart(stock, d1 + timedelta(days=1), close=200.0, volume=2000)
        Command.fill_holes_in_chart_values(stock)
        first = ShortPositionChart.objects.get(stock=stock, date=d1)
        self.assertIsNone(first.close)
        self.assertIsNone(first.volume)

    def test_records_with_close_are_not_overwritten(self):
        stock = make_stock()
        d1 = date(2024, 1, 1)
        make_chart(stock, d1, close=100.0, volume=1000)
        make_chart(stock, d1 + timedelta(days=1), close=200.0, volume=2000)
        Command.fill_holes_in_chart_values(stock)
        c2 = ShortPositionChart.objects.get(stock=stock, date=d1 + timedelta(days=1))
        self.assertAlmostEqual(c2.close, 200.0)
        self.assertEqual(c2.volume, 2000)

    def test_chain_of_holes_uses_most_recent_filled(self):
        """After forward-filling, the next hole pulls from the new value, not the original."""
        stock = make_stock()
        d1 = date(2024, 1, 1)
        make_chart(stock, d1, close=100.0, volume=1000)
        make_chart(stock, d1 + timedelta(days=1), close=None, volume=None)
        make_chart(stock, d1 + timedelta(days=2), close=None, volume=None)
        make_chart(stock, d1 + timedelta(days=3), close=300.0, volume=3000)
        make_chart(stock, d1 + timedelta(days=4), close=None, volume=None)

        Command.fill_holes_in_chart_values(stock)

        # day+4 hole: prev was day+3 (newly filled value 300)
        c5 = ShortPositionChart.objects.get(stock=stock, date=d1 + timedelta(days=4))
        self.assertAlmostEqual(c5.close, 300.0)
        self.assertEqual(c5.volume, 3000)
        # day+1 and day+2 forward-fill from day-1 (100)
        c2 = ShortPositionChart.objects.get(stock=stock, date=d1 + timedelta(days=1))
        c3 = ShortPositionChart.objects.get(stock=stock, date=d1 + timedelta(days=2))
        self.assertAlmostEqual(c2.close, 100.0)
        self.assertAlmostEqual(c3.close, 100.0)


# =============================================================================
# handle() — orchestration
# =============================================================================


class HandleTests(TestCase):
    @patch('shorts.management.commands.fetch_closing_prices.yf.download')
    def test_skips_blocklisted_stock_symbols(self, mock_dl):
        for sym in ['CHR', 'NZYM-B', 'TOP', 'NOBLE']:
            make_stock(code=f'C_{sym}', symbol=sym)
        Command().handle()
        mock_dl.assert_not_called()

    @patch.object(Command, 'fill_holes_in_chart_values')
    @patch.object(Command, 'update_today_price_volume')
    @patch.object(Command, 'fill_initial_missing_data')
    @patch.object(Command, 'did_a_split_occur')
    @patch.object(Command, 'create_missing_chart_values')
    @patch('shorts.management.commands.fetch_closing_prices.yf.download')
    def test_runs_full_pipeline_per_non_blocklisted_stock(
        self, mock_dl, mock_create, mock_split, mock_fill_init, mock_today, mock_holes
    ):
        make_stock(code='A', symbol='A_SYM')
        make_stock(code='B', symbol='B_SYM')
        mock_dl.return_value = make_yf_data(
            [(date.today(), 100, 100, 100, 100, 1000)], ticker='A_SYM.CO'
        )

        Command().handle()

        # yf.download invoked once per stock with .CO suffix
        self.assertEqual(mock_dl.call_count, 2)
        symbols_called = sorted(c.args[0] for c in mock_dl.call_args_list)
        self.assertEqual(symbols_called, ['A_SYM.CO', 'B_SYM.CO'])
        # All five pipeline steps invoked once per stock
        self.assertEqual(mock_create.call_count, 2)
        self.assertEqual(mock_split.call_count, 2)
        self.assertEqual(mock_fill_init.call_count, 2)
        self.assertEqual(mock_today.call_count, 2)
        self.assertEqual(mock_holes.call_count, 2)

    @patch('shorts.management.commands.fetch_closing_prices.yf.download')
    def test_yf_download_called_with_fixed_start_date(self, mock_dl):
        stock = make_stock(code='A', symbol='A_SYM')
        # Seed a chart row so create_missing_chart_values doesn't trip the
        # latent first-is-None bug pinned above.
        make_chart(stock, date(2023, 11, 6))
        mock_dl.return_value = make_yf_data(
            [(date.today(), 100, 100, 100, 100, 1000)], ticker='A_SYM.CO'
        )
        Command().handle()
        kwargs = mock_dl.call_args.kwargs
        self.assertEqual(kwargs.get('start'), '2023-11-06')

    @patch.object(Command, 'create_missing_chart_values')
    @patch('shorts.management.commands.fetch_closing_prices.yf.download')
    def test_per_stock_exception_logs_error_and_continues_with_next(
        self, mock_dl, mock_create
    ):
        make_stock(code='A', symbol='A_SYM')
        make_stock(code='B', symbol='B_SYM')
        # First stock raises during create_missing; second succeeds
        mock_create.side_effect = [RuntimeError('boom'), None]
        mock_dl.return_value = make_yf_data(
            [(date.today(), 100, 100, 100, 100, 1000)], ticker='B_SYM.CO'
        )

        Command().handle()

        # Both stocks were attempted (create called twice)
        self.assertEqual(mock_create.call_count, 2)
        # Only the second one made it to yf.download
        self.assertEqual(mock_dl.call_count, 1)
        # Error logged for the failing stock
        self.assertTrue(Error.objects.filter(message__contains='boom').exists())

    @patch.object(Command, 'fill_holes_in_chart_values')
    @patch.object(Command, 'update_today_price_volume')
    @patch.object(Command, 'fill_initial_missing_data')
    @patch.object(Command, 'did_a_split_occur')
    @patch.object(Command, 'create_missing_chart_values')
    @patch('shorts.management.commands.fetch_closing_prices.yf.download')
    def test_pipeline_order_is_create_split_fillinit_today_holes(
        self, mock_dl, mock_create, mock_split, mock_fill_init, mock_today, mock_holes
    ):
        make_stock(code='A', symbol='A_SYM')
        mock_dl.return_value = make_yf_data(
            [(date.today(), 100, 100, 100, 100, 1000)], ticker='A_SYM.CO'
        )
        call_order = []
        mock_create.side_effect = lambda *a, **kw: call_order.append('create')
        mock_split.side_effect = lambda *a, **kw: call_order.append('split')
        mock_fill_init.side_effect = lambda *a, **kw: call_order.append('fill_init')
        mock_today.side_effect = lambda *a, **kw: call_order.append('today')
        mock_holes.side_effect = lambda *a, **kw: call_order.append('holes')

        Command().handle()

        # create runs before yf.download; everything else after.
        self.assertEqual(
            call_order,
            ['create', 'split', 'fill_init', 'today', 'holes'],
        )
