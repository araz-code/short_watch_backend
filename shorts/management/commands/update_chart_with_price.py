from datetime import datetime, timedelta

import pytz
from django.core.management.base import BaseCommand, CommandError

from django.utils import timezone
from shorts.models import Stock, ShortPositionChart
import yfinance as yf

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')


class Command(BaseCommand):
    help = "add price data to the chart model"

    def handle(self, *args, **options):
        today = timezone.now()

        # Generate the last 7 days, including today
        last_seven_days = [today - timedelta(days=i) for i in range(9)]
        last_seven_days.reverse()

        stocks = Stock.objects.all()

        for stock in stocks:
            if stock.symbol in ['CHR', 'NZYM']:
                continue

            print(stock.symbol)
            data = yf.download(stock.symbol + ".CO", start="2023-11-06")

            for row in data.itertuples(index=True):
                print(f"Date: {row.Index}")
                print(f"Open: {row.Open}, High: {row.High}, Low: {row.Low}, Close: {row.Close}, Close: {row.Volume}\n")

                chart_point = ShortPositionChart.objects.filter(stock=stock, date=row.Index.date())

                if chart_point.exists():
                    chart_point.update(close=row.Close, volume=row.Volume)



