import yfinance as yf
from django.core.management import BaseCommand


class Command(BaseCommand):
    help = "add data to the chart model"

    def handle(self, *args, **options):
        msft = yf.Ticker("AMBU-B.CO")

        # get all stock info
        x = msft.info

        # get historical market data
        hist = msft.history(period="1mo")

        # show meta information about the history (requires history() to be called first)
        y = msft.history_metadata

        pass



