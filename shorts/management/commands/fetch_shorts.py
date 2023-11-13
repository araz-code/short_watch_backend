from datetime import datetime

import pytz
from django.core.management.base import BaseCommand, CommandError
import time

from django.db import transaction
from django.db.models import Max, F
from django.utils import timezone
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.select import Select

from errors.models import Error
from shorts.models import ShortedStock, RunStatus, ShortSeller, ShortedStockChart

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')


class Command(BaseCommand):
    help = "Fetches newest short positions data"

    SHORTS_SITE_URL = 'https://oam.finanstilsynet.dk/#!/stats-and-extracts-short-net-positions'
    HOLDERS_SITE_URL = 'https://oam.finanstilsynet.dk/#!/stats-and-extracts-individual-short-net-positions'

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

        self.fetch_short_sellers(driver)

        driver.quit()

    def fetch_short_sellers(self, driver):
        try:
            driver.get(self.HOLDERS_SITE_URL)
            time.sleep(7)

            dropdown = Select(driver.find_element(By.TAG_NAME, "select"))
            dropdown.select_by_index(3)
            time.sleep(7)

            elements = driver.find_elements(By.CSS_SELECTOR, '.ui-grid-cell-contents.ng-binding.ng-scope')

            holders_data = []

            for i in range(0, len(elements), 6):
                corrected_date = datetime.strptime(elements[i + 5].text, '%d-%m-%Y')

                holders_data.append(
                    ShortSeller(name=elements[i].text,
                                business_id=elements[i + 1].text,
                                stock_code=elements[i + 2].text,
                                stock_name=elements[i + 3].text,
                                value=float(elements[i + 4].text.replace(',', '.')),
                                date=corrected_date)
                )

            ShortSeller.objects.all().delete()

            ShortSeller.objects.bulk_create(holders_data)

        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')

    def fetch_short_positions(self, driver):
        try:
            driver.get(self.SHORTS_SITE_URL)
            time.sleep(7)

            dropdown = Select(driver.find_element(By.TAG_NAME, "select"))
            dropdown.select_by_index(3)
            time.sleep(7)

            elements = driver.find_elements(By.CSS_SELECTOR, '.ui-grid-cell-contents.ng-binding.ng-scope')

            short_data = []

            for i in range(0, len(elements), 4):
                corrected_datetime = datetime.strptime(elements[i + 3].text, '%d-%m-%Y %H:%M:%S')

                short_data.append(
                    ShortedStock(code=elements[i].text,
                                 name=elements[i + 1].text,
                                 value=float(elements[i + 2].text.replace(',', '.')),
                                 timestamp=copenhagen_timezone.localize(corrected_datetime))
                )

            short_codes = []
            with transaction.atomic():
                for short in short_data:
                    short_codes.append(short.code)
                    existing_short = ShortedStock.objects.filter(
                        code=short.code,
                        name=short.name,
                        value=short.value,
                        timestamp=short.timestamp,
                    ).first()

                    if existing_short is None:
                        short.save()

                    ShortedStockChart.objects.update_or_create(
                        code=short.code,
                        date=timezone.now(),
                        defaults={
                            'value': short.value,
                            'name': short.name
                        }
                    )

            with transaction.atomic():
                subquery = ShortedStock.objects.values('code', 'name').annotate(max_timestamp=Max('timestamp'))
                distinct_stocks = ShortedStock.objects.filter(timestamp__in=subquery.values('max_timestamp'))
                for short in distinct_stocks:
                    if short.code not in short_codes:
                        if short.value != 0:
                            ShortedStock(code=short.code,
                                         name=short.name,
                                         value=0.0,
                                         timestamp=timezone.now()).save()

                        ShortedStockChart.objects.update_or_create(
                            code=short.code,
                            date=timezone.now(),
                            defaults={
                                'value': short.value,
                                'name': short.name
                            }
                        )

            RunStatus.objects.create()
        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')


