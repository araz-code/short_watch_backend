from datetime import datetime, timedelta, time
import pandas as pd
import pytz
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from errors.models import Error
from shorts.models import Stock, ShortPositionChart
import yfinance as yf

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')


class Command(BaseCommand):
    help = "Add price data to the chart model"

    def handle(self, *args, **options):
        stocks = list(Stock.objects.filter(active=True))

        # Phase 1: backfill chart skeleton per stock (no network)
        ready = []
        for stock in stocks:
            try:
                self.create_missing_chart_values(stock)
                ready.append(stock)
            except Exception as e:
                Error.objects.create(message=str(e)[:500])

        if not ready:
            return

        # Phase 2: single bulk yf.download for all tickers
        tickers = [f'{s.symbol}.CO' for s in ready]
        try:
            bulk_data = yf.download(
                ' '.join(tickers),
                start='2023-11-06',
                auto_adjust=True,
                progress=False,
                group_by='ticker',
            )
        except Exception as e:
            Error.objects.create(message=f'bulk yf.download failed: {str(e)[:480]}')
            return

        # Phase 3: per-stock pipeline against the sliced frame
        for stock in ready:
            try:
                data = self._extract_ticker_frame(bulk_data, f'{stock.symbol}.CO')
                if data is None or data.empty:
                    continue

                self.did_a_split_occur(stock, data)
                self.fill_initial_missing_data(stock, data)
                self.update_today_price_volume(data, stock)
                self.fill_holes_in_chart_values(stock)
                self.update_shares_outstanding(stock)
            except Exception as e:
                Error.objects.create(message=str(e)[:500])

    @staticmethod
    def _extract_ticker_frame(bulk_data, ticker):
        """
        Slice a single-ticker flat-column OHLCV frame out of a bulk yf.download
        response.

        With group_by='ticker' and multiple tickers, columns are a MultiIndex
        of (ticker, price_type); selecting bulk_data[ticker] yields a flat
        frame. With a single ticker yfinance returns flat columns directly.
        Rows that are all-NaN (no quote that day for this ticker) are dropped.
        """
        if bulk_data is None or bulk_data.empty:
            return None
        if isinstance(bulk_data.columns, pd.MultiIndex):
            if ticker not in bulk_data.columns.get_level_values(0):
                return None
            df = bulk_data[ticker]
        else:
            df = bulk_data
        df = df.dropna(how='all')
        return df if not df.empty else None

    @staticmethod
    def update_shares_outstanding(stock):
        try:
            ticker = yf.Ticker(f'{stock.symbol}.CO')
            shares = None
            try:
                shares = ticker.fast_info.get('shares')
            except Exception:
                shares = None
            if not shares:
                shares = ticker.info.get('sharesOutstanding')
            if shares:
                stock.shares_outstanding = int(shares)
                stock.save(update_fields=['shares_outstanding'])
        except Exception as e:
            Error.objects.create(
                message=f'update_shares_outstanding {stock.symbol}: {str(e)[:400]}'
            )

    @staticmethod
    def update_today_price_volume(data, stock):
        try:
            last = data.iloc[-1]
            ShortPositionChart.objects.filter(stock=stock, date=data.index[-1].date()) \
                .update(close=round(last.Close, 2), high=round(last.High, 2), low=round(last.Low, 2), volume=last.Volume)
        except Exception as e:
            Error.objects.create(
                message=f'update_today_price_volume {stock.symbol}: {str(e)[:400]}'
            )

    @staticmethod
    def create_missing_chart_values(stock: Stock):
        first = ShortPositionChart.objects.filter(stock=stock).order_by('date').first()

        start_date = datetime(2023, 11, 6).date()

        if not first or first.date > start_date:
            Error.objects.create(message=f'create_missing_chart_values {stock.symbol}: '
                                         f'First record {first.date} was after 6. November 2023')
            end_date = first.date if first else datetime.now().date()

            while start_date < end_date:
                timestamp = datetime.combine(start_date, time(23, 45))
                timestamp = timezone.make_aware(timestamp, timezone.get_current_timezone())

                exists = ShortPositionChart.objects.filter(
                    stock=stock,
                    date=start_date,
                ).exists()

                if not exists:
                    ShortPositionChart.objects.create(
                        stock=stock,
                        date=start_date,
                        value=0,
                        timestamp=timestamp,
                    )
                else:
                    Error.objects.create(message=f'create_missing_chart_values {stock.symbol}: '
                                                 f'THIS SHOULD NOT HAPPEN: Chart entry already exist: {start_date}')

                start_date += timedelta(days=1)

    @staticmethod
    def fill_initial_missing_data(stock, data):
        count = ShortPositionChart.objects.filter(stock=stock, close=None).count()
        count_missing_high = ShortPositionChart.objects.filter(stock=stock, high=None).count()

        if count > 10 or count_missing_high > 10:
            Error.objects.create(message=f'fill_initial_missing_data {stock.symbol}: '
                                         f'Filling out empty values.')

            for row in data.itertuples(index=True):
                try:
                    ShortPositionChart.objects.update_or_create(
                        stock=stock,
                        date=row.Index.date(),
                        defaults={
                            'close': round(row.Close, 2),
                            'high': round(row.High, 2),
                            'low': round(row.Low, 2),
                            'volume': row.Volume,
                        }
                    )
                except Exception as e:
                    Error.objects.create(
                        message=f'fill_initial_missing_data {stock.symbol} '
                                f'{row.Index.date()}: {str(e)[:300]}'
                    )

    @staticmethod
    def did_a_split_occur(stock, data):
        try:
            if len(data) < 2:
                return

            prev_chart_point = ShortPositionChart.objects.filter(
                stock=stock, date=data.index[-2].date()
            ).first()

            if not prev_chart_point or prev_chart_point.close is None:
                return

            current_close = data['Close'].iloc[-1]
            prev_close = prev_chart_point.close

            percent_diff = abs((current_close - prev_close) / prev_close) * 100 if prev_close else 0

            if percent_diff > 10:
                Error.objects.create(message=f'did_a_split_occur {stock.symbol}: '
                                             f'The percentage difference is {percent_diff} so rerun.')
                ShortPositionChart.objects.filter(stock=stock).update(close=None, volume=None)
        except Exception as e:
            Error.objects.create(
                message=f'did_a_split_occur {stock.symbol}: {str(e)[:400]}'
            )


    @staticmethod
    def fill_holes_in_chart_values(stock):
        chart_values = list(
            ShortPositionChart.objects.filter(stock=stock).order_by('date')
        )

        to_update = []
        prev = None
        for chart_value in chart_values:
            if prev and chart_value.close is None:
                chart_value.close = prev.close
                chart_value.high = prev.high
                chart_value.low = prev.low
                chart_value.volume = prev.volume
                to_update.append(chart_value)
            else:
                prev = chart_value

        if to_update:
            ShortPositionChart.objects.bulk_update(to_update, ['close', 'high', 'low', 'volume'])
