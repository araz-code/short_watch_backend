"""Print every step of the price-flow calculation for one stock.

Use this to verify the math behind the "Price flow" table on the details page.
The output mirrors `_compute_price_flow` in shorts/views.py exactly.

Examples:
    python manage.py debug_price_flow BAVA
    python manage.py debug_price_flow BAVA --csv > bava_flow.csv
    python manage.py debug_price_flow BAVA --from 2024-01-01 --to 2024-12-31
"""
import csv
import math
import sys
from datetime import date

from django.core.management.base import BaseCommand, CommandError

from shorts.models import Stock, ShortPositionChart

BUCKET_WIDTH = 0.02  # must match views.PRICE_FLOW_BUCKET_WIDTH


class Command(BaseCommand):
    help = "Dump per-day delta_shares and bucket aggregates for a stock"

    def add_arguments(self, parser):
        parser.add_argument('code', help='Stock code or symbol (e.g. BAVA)')
        parser.add_argument('--csv', action='store_true',
                            help='Emit CSV instead of pretty tables')
        parser.add_argument('--from', dest='from_date', type=str,
                            help='Inclusive start date YYYY-MM-DD')
        parser.add_argument('--to', dest='to_date', type=str,
                            help='Inclusive end date YYYY-MM-DD')

    def handle(self, *args, **options):
        code = options['code']
        try:
            stock = Stock.objects.get(code=code)
        except Stock.DoesNotExist:
            try:
                stock = Stock.objects.get(symbol=code)
            except Stock.DoesNotExist:
                raise CommandError(f'No stock with code or symbol {code!r}')

        if not stock.shares_outstanding:
            raise CommandError(
                f'{stock.symbol} has no shares_outstanding set, run fetch_closing_prices first'
            )

        from_date = _parse_date(options.get('from_date'))
        to_date = _parse_date(options.get('to_date'))

        rows = list(
            ShortPositionChart.objects
            .filter(stock=stock)
            .order_by('date')
            .values('date', 'value', 'close')
        )
        usable = [
            r for r in rows
            if r['value'] is not None and r['close'] is not None and r['close'] > 0
        ]
        if from_date:
            usable = [r for r in usable if r['date'] >= from_date]
        if to_date:
            usable = [r for r in usable if r['date'] <= to_date]

        if len(usable) < 2:
            raise CommandError('Not enough usable rows to compute deltas')

        shares_out = stock.shares_outstanding
        min_price = min(r['close'] for r in usable)
        log_step = math.log(1 + BUCKET_WIDTH)

        # Per-day breakdown.
        # Bucket is assigned by *prev* row's close, because DFSA T+1 disclosure
        # means a delta first visible on day N reflects a trade executed on
        # ~day N-1.
        per_day = []
        buckets = {}
        prev = usable[0]
        for cur in usable[1:]:
            delta_pct = cur['value'] - prev['value']
            delta_shares = delta_pct / 100.0 * shares_out
            idx = int(math.log(prev['close'] / min_price) / log_step)
            low = min_price * (1 + BUCKET_WIDTH) ** idx
            high = low * (1 + BUCKET_WIDTH)
            per_day.append({
                'date': cur['date'],
                'value': cur['value'],
                'prev_date': prev['date'],
                'prev_value': prev['value'],
                'delta_pct': delta_pct,
                'delta_shares': delta_shares,
                'trade_close': prev['close'],
                'report_close': cur['close'],
                'bucket_idx': idx,
                'bucket_low': low,
                'bucket_high': high,
            })
            b = buckets.setdefault(idx, {'shorted': 0.0, 'covered': 0.0, 'low': low, 'high': high})
            if delta_shares > 0:
                b['shorted'] += delta_shares
            elif delta_shares < 0:
                b['covered'] += -delta_shares
            prev = cur

        if options['csv']:
            self._emit_csv(per_day, buckets, stock, min_price, shares_out)
        else:
            self._emit_pretty(per_day, buckets, stock, min_price, shares_out)

    def _emit_pretty(self, per_day, buckets, stock, min_price, shares_out):
        out = self.stdout.write
        out(f'Stock:  {stock.symbol}  ({stock.code})  {stock.name}')
        out(f'Shares outstanding: {shares_out:,}')
        out(f'Min observed close: {min_price:.4f}    Bucket width: {BUCKET_WIDTH * 100:.1f}%')
        out(f'Rows in calc:        {len(per_day)}')
        out('')
        out('Per-day deltas (skip days where value or close is null):')
        out('Bucket is assigned by trade_close = previous row\'s close (T+1 disclosure).')
        out(f'{"report_date":<12} {"trade_date":<12} {"value%":>8} {"prev%":>8} {"Δ%":>9}'
            f' {"Δ_shares":>14} {"trade_close":>12} {"bkt":>4} {"range":>20}')
        for r in per_day:
            sign = '+' if r['delta_shares'] >= 0 else ''
            out(f'{str(r["date"]):<12} {str(r["prev_date"]):<12}'
                f' {r["value"]:>8.4f} {r["prev_value"]:>8.4f}'
                f' {r["delta_pct"]:>+9.4f} {sign}{r["delta_shares"]:>13,.0f}'
                f' {r["trade_close"]:>12.4f} {r["bucket_idx"]:>4d}'
                f' {r["bucket_low"]:>8.2f}–{r["bucket_high"]:>8.2f}')

        out('')
        out('Bucket totals (this is what the API/table shows):')
        out(f'{"bkt":>4} {"range":>22} {"mid":>8} {"shorted":>14} {"covered":>14} {"net":>14}')
        total_shorted = total_covered = 0.0
        for idx in sorted(buckets):
            b = buckets[idx]
            net = b['shorted'] - b['covered']
            mid = (b['low'] + b['high']) / 2
            total_shorted += b['shorted']
            total_covered += b['covered']
            out(f'{idx:>4d} {b["low"]:>9.2f}–{b["high"]:>9.2f} {mid:>8.2f}'
                f' {b["shorted"]:>14,.0f} {b["covered"]:>14,.0f} {net:>+14,.0f}')
        out('')
        out(f'Sum across buckets:    shorted={total_shorted:,.0f}    covered={total_covered:,.0f}'
            f'    net={total_shorted - total_covered:+,.0f}')
        # Independent cross-check: net should equal (last_value - first_value)/100 * shares_out
        first_val = per_day[0]['prev_value']
        last_val = per_day[-1]['value']
        expected_net = (last_val - first_val) / 100.0 * shares_out
        out(f'Independent check:     (last%={last_val:.4f} − first%={first_val:.4f}) / 100 × shares'
            f' = {expected_net:+,.0f}')
        diff = (total_shorted - total_covered) - expected_net
        out(f'Difference:            {diff:+,.4f}   (should be ~0 modulo rounding)')

    def _emit_csv(self, per_day, buckets, stock, min_price, shares_out):
        w = csv.writer(sys.stdout)
        w.writerow(['# stock', stock.symbol, stock.code, stock.name])
        w.writerow(['# shares_outstanding', shares_out])
        w.writerow(['# min_price', min_price])
        w.writerow(['# bucket_width', BUCKET_WIDTH])
        w.writerow([])
        w.writerow(['report_date', 'trade_date', 'value_pct', 'prev_value_pct',
                    'delta_pct', 'delta_shares', 'trade_close', 'report_close',
                    'bucket_idx', 'bucket_low', 'bucket_high'])
        for r in per_day:
            w.writerow([r['date'], r['prev_date'], r['value'], r['prev_value'],
                        r['delta_pct'], round(r['delta_shares'], 4),
                        r['trade_close'], r['report_close'], r['bucket_idx'],
                        round(r['bucket_low'], 4), round(r['bucket_high'], 4)])
        w.writerow([])
        w.writerow(['bucket_idx', 'bucket_low', 'bucket_high', 'mid', 'shorted', 'covered', 'net'])
        for idx in sorted(buckets):
            b = buckets[idx]
            mid = (b['low'] + b['high']) / 2
            w.writerow([idx, round(b['low'], 4), round(b['high'], 4), round(mid, 4),
                        round(b['shorted']), round(b['covered']),
                        round(b['shorted'] - b['covered'])])


def _parse_date(s):
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except ValueError:
        raise CommandError(f'Invalid date {s!r}; expected YYYY-MM-DD')
