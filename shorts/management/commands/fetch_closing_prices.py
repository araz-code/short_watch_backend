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

        # show holders
        a = msft.major_holders
        b = msft.institutional_holders
        c = msft.mutualfund_holders

        # Show future and historic earnings dates, returns at most next 4 quarters and last 8 quarters by default.
        # Note: If more are needed use msft.get_earnings_dates(limit=XX) with increased limit argument.
        d = msft.earnings_dates


        pass



