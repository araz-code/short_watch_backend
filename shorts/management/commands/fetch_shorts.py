from datetime import datetime

import pytz
from django.core.management.base import BaseCommand, CommandError
import time

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.select import Select

from errors.models import Error
from request_logging.service import delete_old_logs, process_visits
from shorts.models import ShortPosition, RunStatus, ShortSeller, ShortPositionChart, Stock

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')


class Command(BaseCommand):
    help = "Fetches newest short positions data"

    SHORTS_SITE_URL = 'https://oam.finanstilsynet.dk/#!/stats-and-extracts-short-net-positions'
    HOLDERS_SITE_URL = 'https://oam.finanstilsynet.dk/#!/stats-and-extracts-individual-short-net-positions'

    MAX_RETRIES = 2
    RETRY_SLEEP_INTERVAL = 60

    @staticmethod
    def _get_webdriver():
        chrome_options = webdriver.ChromeOptions()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--disable-gpu")

        return webdriver.Chrome(options=chrome_options)

    def handle(self, *args, **options):
        driver = self._get_webdriver()

        self.fetch_short_positions(driver)

        if self.is_within_range_around_whole_hour():
            self.fetch_short_sellers(driver)

        driver.quit()

        delete_old_logs()
        process_visits()

    @staticmethod
    def is_within_range_around_whole_hour(minutes_around=4):
        current_time = datetime.now().time()
        current_minutes = current_time.minute

        # Check if the current time is within the specified range around whole hours
        return current_minutes <= minutes_around or current_minutes >= 60 - minutes_around

    def fetch_short_sellers(self, driver):
        try:
            driver.get(self.HOLDERS_SITE_URL)
            time.sleep(15)

            dropdown = Select(driver.find_element(By.TAG_NAME, "select"))
            dropdown.select_by_index(3)
            time.sleep(15)

            elements = driver.find_elements(By.CSS_SELECTOR, '.ui-grid-cell-contents.ng-binding.ng-scope')

            holders_data = []

            for i in range(0, len(elements), 6):
                corrected_date = datetime.strptime(elements[i + 5].text, '%d-%m-%Y')
                stock_code = elements[i + 2].text
                stock_name = elements[i + 3].text

                holders_data.append(
                    ShortSeller(stock=self.get_or_create_stock(stock_code, stock_name),
                                name=elements[i].text,
                                business_id=elements[i + 1].text,
                                value=float(elements[i + 4].text.replace(',', '.')),
                                date=corrected_date)
                )

            ShortSeller.objects.all().delete()

            ShortSeller.objects.bulk_create(holders_data)

        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')

    def fetch_short_positions(self, driver):
        retry_count = 0

        while retry_count < self.MAX_RETRIES:

            try:
                driver.get(self.SHORTS_SITE_URL)
                time.sleep(9)

                dropdown = Select(driver.find_element(By.TAG_NAME, "select"))
                dropdown.select_by_index(3)
                time.sleep(13)

                elements = driver.find_elements(By.CSS_SELECTOR, '.ui-grid-cell-contents.ng-binding.ng-scope')

                short_data = []

                for i in range(0, len(elements), 4):
                    corrected_datetime = datetime.strptime(elements[i + 3].text, '%d-%m-%Y %H:%M:%S')
                    code = elements[i].text
                    name = elements[i + 1].text
                    try:
                        value = float(elements[i + 2].text.replace(',', '.'))
                    except ValueError as e:
                        continue

                    short_data.append(
                        ShortPosition(stock=self.get_or_create_stock(code, name),
                                      value=value,
                                      timestamp=copenhagen_timezone.localize(corrected_datetime))
                    )

                short_codes = []
                with transaction.atomic():
                    for short in short_data:
                        short_codes.append(short.stock.code)
                        existing_short = ShortPosition.objects.filter(
                            stock=short.stock,
                            value=short.value,
                            timestamp=short.timestamp,
                        ).first()

                        if existing_short is None:
                            short.save()

                        now = timezone.now()
                        ShortPositionChart.objects.update_or_create(
                            stock=short.stock,
                            date=now,
                            defaults={
                                'value': short.value,
                                'timestamp': now
                            }
                        )

                count_new_closed_shorts = 0
                with transaction.atomic():
                    subquery = ShortPosition.objects.values('stock__code', 'stock__name')\
                        .annotate(max_timestamp=Max('timestamp'))
                    distinct_stocks = ShortPosition.objects.filter(timestamp__in=subquery.values('max_timestamp'))

                    for short in distinct_stocks:
                        if short.stock.code not in short_codes:
                            if short.value != 0:
                                count_new_closed_shorts += 1

                    if count_new_closed_shorts > 2:
                        Error.objects.create(message=f'An unexpected number of shorts got closed: '
                                                     f'{count_new_closed_shorts}. Most be an error.')
                    else:
                        for short in distinct_stocks:
                            if short.stock.code not in short_codes:
                                if short.value != 0:
                                    ShortPosition(stock=short.stock,
                                                  value=0.0,
                                                  timestamp=timezone.now()).save()

                                    Error.objects.create(message=f'Short position for {short.stock.symbol} got closed!'
                                                                 f' Check if error.')

                                now = timezone.now()
                                ShortPositionChart.objects.update_or_create(
                                    stock=short.stock,
                                    date=now,
                                    defaults={
                                        'value': 0.0,
                                        'timestamp': now
                                    }
                                )

                RunStatus.objects.create()

                break
            except Exception as e:
                retry_count += 1
                Error.objects.create(message=f'Retrying ({retry_count}/{self.MAX_RETRIES}) after '
                                             f'{self.RETRY_SLEEP_INTERVAL} seconds., Error occurred: {str(e)}'[:500])

                time.sleep(self.RETRY_SLEEP_INTERVAL)

        else:
            message = f'Max retries ({self.MAX_RETRIES}) reached. Command failed.'
            Error.objects.create(message=message)
            raise CommandError(message)

    @staticmethod
    def get_or_create_stock(code, name):
        try:
            # Try to get the existing stock
            stock = Stock.objects.get(code=code)
        except Stock.DoesNotExist:
            # If it doesn't exist, create a new one
            stock = Stock(code=code, name=name, symbol=name[:20])
            stock.save()

        return stock
