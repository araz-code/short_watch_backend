from datetime import datetime, timedelta, time
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
        stocks = Stock.objects.all()

        for stock in stocks:
            try:
                if stock.symbol in ['CHR', 'NZYM-B', 'TOP', 'NOBLE']:
                    continue

                self.create_missing_chart_values(stock)

                data = yf.download(f'{stock.symbol}.CO', start='2023-11-06')

                self.did_a_split_occur(stock, data)

                self.fill_initial_missing_data(stock, data)

                self.update_today_price_volume(data, stock)

                self.fill_holes_in_chart_values(stock)
            except Exception as e:
                Error.objects.create(message=str(e)[:500])

    @staticmethod
    def update_today_price_volume(data, stock):
        try:
            # ShortPositionChart.objects.filter(stock=stock, date=data.tail(1).index.date[0]) \
             #   .update(close=round(data.tail(1).iloc[0].Close, 2), volume=data.tail(1).iloc[0].Volume)

            ShortPositionChart.objects.filter(stock=stock, date=data.tail(1).index[0].to_pydatetime().date()) \
                .update(close=round(data.tail(1).iloc[0].Close, 2), volume=data.tail(1).iloc[0].Volume)
        except Exception as e:
            print('update_today_price_volume error')

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

        if count > 10 and stock.symbol != 'SVITZR' or count > 186 and stock.symbol == 'SVITZR':
            Error.objects.create(message=f'fill_initial_missing_data {stock.symbol}: '
                                         f'Filling out empty values.')

            for row in data.itertuples(index=True):
                try:
                    ShortPositionChart.objects.update_or_create(
                        stock=stock,
                        date=row.Index.date(),
                        defaults={
                            'close': round(row.Close, 2),
                            'volume': row.Volume
                        }
                    )
                except Exception as e:
                    Error.objects.create(message=f'fill_initial_missing_data {stock.symbol}: '
                                                 f"THIS SHOULD NOT HAPPEN: Value doesn't exist: {row.Index.date()}.")

    @staticmethod
    def did_a_split_occur(stock, data):
        try:
            # prev_chart_point = ShortPositionChart.objects.filter(stock=stock, date=data.tail(2).index.date[0]).first()
            prev_chart_point = ShortPositionChart.objects.filter(stock=stock, date=data.tail(2).index[0].date()).first()

            if not prev_chart_point or prev_chart_point.close is None:
                return

            current_close = data.tail(1).iloc[0].Close
            prev_close = prev_chart_point.close

            percent_diff = abs((current_close - prev_close) / prev_close) * 100 if prev_close else 0

            if percent_diff > 10:
                Error.objects.create(message=f'did_a_split_occur {stock.symbol}: '
                                             f'The percentage difference is {percent_diff} so rerun.')
                ShortPositionChart.objects.filter(stock=stock).update(close=None, volume=None)
        except Exception as e:
            print('did_a_split_occur error')


    @staticmethod
    def fill_holes_in_chart_values(stock):
        chart_values = ShortPositionChart.objects.filter(stock=stock).order_by('date')

        prev = None
        for chart_value in list(chart_values):
            if prev and chart_value.close is None:
                chart_value.close = prev.close
                chart_value.volume = prev.volume
                chart_value.save()
            else:
                prev = chart_value
