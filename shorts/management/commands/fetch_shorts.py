from datetime import datetime

import pytz
from django.core.management.base import BaseCommand, CommandError
import time

from django.db import transaction
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.select import Select

from errors.models import Error
from shorts.models import ShortedStock, RunStatus

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')


class Command(BaseCommand):
    help = "Closes the specified poll for voting"

    SITE_URL = 'https://oam.finanstilsynet.dk/#!/stats-and-extracts-short-net-positions'

    def _get_webdriver(self):
        chrome_options = webdriver.ChromeOptions()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--disable-gpu")

        return webdriver.Chrome(options=chrome_options)

    def handle(self, *args, **options):
        try:
            driver = self._get_webdriver()

            driver.get(self.SITE_URL)
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

            with transaction.atomic():
                for short in short_data:
                    existing_short = ShortedStock.objects.filter(
                        code=short.code,
                        name=short.name,
                        value=short.value,
                        timestamp=short.timestamp,
                    ).first()

                    if existing_short is None:
                        short.save()

            driver.quit()

            RunStatus.objects.create()
        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')
