import re
from datetime import datetime, timedelta

import pytz
from django.core.management.base import BaseCommand, CommandError
import time
import requests

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from firebase_admin.exceptions import InvalidArgumentError
from firebase_admin.messaging import UnregisteredError
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.select import Select

from errors.models import Error
from request_logging.service import delete_old_logs, process_visits
from short_watch_backend.settings import ANNOUNCEMENT_API_KEY, FCM_SERVICE_ACCOUNT_FILE, DEBUG
from shorts.models import ShortPosition, RunStatus, LargeShortSelling, ShortPositionChart, Stock, Announcement, \
    CompanyMap, ShortSeller

import firebase_admin
from firebase_admin import credentials, messaging

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')

cred = credentials.Certificate(FCM_SERVICE_ACCOUNT_FILE)
firebase_admin.initialize_app(cred)


class Command(BaseCommand):
    help = "Fetches newest short positions data"

    SHORTS_SITE_URL = 'https://oam.finanstilsynet.dk/#!/stats-and-extracts-short-net-positions'
    HOLDERS_SITE_URL = 'https://oam.finanstilsynet.dk/#!/stats-and-extracts-individual-short-net-positions'

    ANNOUNCEMENTS_SITE_URL = 'https://ft-api.prod.oam.finanstilsynet.dk/external/v0.1/trigger/dfsa-search-announcement'

    ANNOUNCEMENTS_HEADERS = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ANNOUNCEMENT_API_KEY}'
    }

    ANNOUNCEMENTS_BODY = {
        'SortField': 'RegistrationDate',
        'Ascending': False,
        'Skip': 0,
        'Take': 100,
        'Status': [
            'Not Published'
        ],
        'IncludeHistoric': True
    }

    SHORT_SELLER_URL = 'https://ft-api.prod.oam.finanstilsynet.dk/api/v0.1/widget/' \
                       'd158b82c-e9b7-4384-b8d2-ad570127ba11/data'

    SHORT_SELLER_HEADERS = {
        f'authorization': ANNOUNCEMENT_API_KEY,
        'content-type': 'application/json',
        'workersiteid': 'cc2aa132-ec77-4a8c-95af-abb101459cbc',
    }

    SHORT_SELLER_BODY = {
        'Pagination': {
            'PageIndex': 1,
            'PageSize': 75
        },
        'clauses': None,
        'container': {
            'ContainerId': 'a4939c8d-510e-44e2-8b75-ad5701285484',
            'ContainerType': 'WidgetContainer'
        },
        'sortedFields': []
    }

    import requests

    SHORT_POSITIONS_URL = "https://ft-api.prod.oam.finanstilsynet.dk/api/v0.1/widget/" \
                          "ad758542-8116-4055-95b3-ad57011ba36a/data"

    SHORT_POSITIONS_HEADERS = {
        'authorization': ANNOUNCEMENT_API_KEY,
        'workersiteid': 'cc2aa132-ec77-4a8c-95af-abb101459cbc',
    }

    SHORT_POSITIONS_BODY = {
        'Pagination': {'PageIndex': 1, 'PageSize': 75},
        'clauses': None,
        'container': {
            'ContainerId': '7c3b384b-0762-49b0-a07e-ad57011c2812',
            'ContainerType': 'WidgetContainer'
        },
        'sortedFields': []
    }

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

        self.fetch_announcements()

        self.fetch_short_positions_requests(driver)

        # if self.is_within_range_around_whole_hour():
        self.fetch_short_sellers_requests(driver)

        driver.quit()

        delete_old_logs()
        process_visits()

    @staticmethod
    def is_within_range_around_whole_hour(minutes_around=4):
        current_time = datetime.now().time()
        current_minutes = current_time.minute

        # Check if the current time is within the specified range around whole hours
        return current_minutes <= minutes_around or current_minutes >= 60 - minutes_around

    def fetch_short_sellers_requests(self, driver):
        try:
            response = requests.post(self.SHORT_SELLER_URL, headers=self.SHORT_SELLER_HEADERS,
                                     json=self.SHORT_SELLER_BODY)

            if response.status_code == 200:
                sellers = response.json()['data']

                for seller in sellers:
                    # Correct the date by adding one day
                    corrected_date = datetime.strptime(seller['PositionDate'], '%Y-%m-%dT%H:%M:%SZ') + timedelta(days=1)
                    stock_code = seller['IssuerCode']
                    stock_name = seller['IssuerName']

                    LargeShortSelling.objects.update_or_create(
                        stock=self.get_or_create_stock(stock_code, stock_name),
                        name=seller['Positionsholder'],
                        date=corrected_date.strftime('%Y-%m-%d'),
                        defaults={'business_id': seller['PositionsholderCVR'],
                                  'value': float(seller['TotalPercentageShareCapital']),
                                  'short_sellers': self.get_seller_for_announcement(seller['Positionsholder'])}
                    )
            else:
                Error.objects.create(message="fetch_short_sellers_selenium was run instead")
                self.fetch_short_sellers_selenium(driver)

        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')

    def fetch_short_sellers_selenium(self, driver):
        try:
            driver.get(self.HOLDERS_SITE_URL)
            time.sleep(15)

            dropdown = Select(driver.find_element(By.TAG_NAME, "select"))
            dropdown.select_by_index(3)
            time.sleep(15)

            elements = driver.find_elements(By.CSS_SELECTOR, '.ui-grid-cell-contents.ng-binding.ng-scope')

            for i in range(0, len(elements), 6):
                corrected_date = datetime.strptime(elements[i + 5].text, '%d-%m-%Y')
                stock_code = elements[i + 2].text
                stock_name = elements[i + 3].text

                LargeShortSelling.objects.update_or_create(
                    stock=self.get_or_create_stock(stock_code, stock_name),
                    name=elements[i].text,
                    date=corrected_date.strftime('%Y-%m-%d'),
                    defaults={'business_id': elements[i + 1].text,
                              'value': float(elements[i + 4].text.replace(',', '.')),
                              'short_sellers': self.get_seller_for_announcement(elements[i].text)}
                )

        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')

    def fetch_announcements(self):
        try:
            response = requests.post(self.ANNOUNCEMENTS_SITE_URL, json=self.ANNOUNCEMENTS_BODY,
                                     headers=self.ANNOUNCEMENTS_HEADERS)

            if response.status_code == 200:
                announcements = response.json()['data']
                for item in announcements:
                    stock = self.get_stock_for_announcement(item.get('IssuerName'),
                                                            item.get('AnnouncedCompanyName'))

                    if not stock:
                        continue

                    value = None
                    seller = None
                    if item.get('Type') == 'Shortselling':
                        match = re.search(r"(\d+\.\d+)%", item.get("Headline"))

                        if match:
                            value = match.group(1)

                        if item.get("AnnouncedCompanyName"):
                            seller = self.get_seller_for_announcement(item.get("AnnouncedCompanyName"))

                    try:
                        _ = Announcement.objects.update_or_create(
                            stock=stock,
                            announcement_number=item["AnnouncementNumber"],
                            issuer_name=item["IssuerName"],
                            defaults={
                                "announced_company_name": item.get("AnnouncedCompanyName"),
                                "cvr_company_name": item.get("CVRCompanyName"),
                                "headline": item.get("Headline"),
                                "headline_danish": item.get("HeadlineDanish"),
                                "shortselling_type": item.get("ShortsellingType"),
                                "status": item.get("Status"),
                                "type": item.get("Type"),
                                "notification_datetime_to_company": parse_datetime(
                                    item.get("NotificationDateTimeToCompany"))
                                if item.get("NotificationDateTimeToCompany") else None,
                                "publication_date": parse_datetime(item.get("PublicationDate"))
                                if item.get("PublicationDate") else None,
                                "published_date": parse_datetime(item.get("PublishedDate")),
                                "registration_date": parse_datetime(item.get("RegistrationDate")),
                                "registration_datetime": parse_datetime(item.get("RegistrationDateTime")),
                                "is_historic": item.get("IsHistoric", False),
                                "shortselling_country": item.get("ShortsellingCountry"),
                                "shortselling_country_danish": item.get("ShortsellingCountryDanish"),
                                "dfsa_id": item.get("Id", ""),
                                "value": value,
                                "short_seller": seller,
                            }
                        )
                    except Exception as e:
                        Error.objects.create(message=f"Could not create announcement: {str(item)[:450]}]")
            else:
                Error.objects.create(message=f"Failed to fetch announcements. Status code: {response.status_code}")
                raise CommandError(f'Error occurred')

        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')

    def fetch_short_positions_requests(self, driver):
        retry_count = 0

        while retry_count < self.MAX_RETRIES:
            try:
                response = requests.post(self.SHORT_POSITIONS_URL, headers=self.SHORT_POSITIONS_HEADERS,
                                         json=self.SHORT_POSITIONS_BODY)

                if response.status_code == 200:
                    short_positions = response.json()['data']

                    short_data = []

                    for short_position in short_positions:
                        try:
                            corrected_datetime = datetime.strptime(short_position['LastReported'],
                                                                   '%Y-%m-%dT%H:%M:%S.%fZ')
                        except ValueError:
                            corrected_datetime = datetime.strptime(short_position['LastReported'],
                                                                   '%Y-%m-%dT%H:%M:%SZ')

                        code = short_position['IssuerCode']
                        name = short_position['IssuerName2']
                        value = round(short_position['TotalPercentageShareCapital'], 2)

                        utc_datetime = pytz.utc.localize(corrected_datetime)
                        short_data.append(
                            ShortPosition(stock=self.get_or_create_stock(code, name),
                                          value=value,
                                          timestamp=utc_datetime.astimezone(copenhagen_timezone))
                        )

                    self.fetch_short_positions(short_data)
                else:
                    Error.objects.create(message="fetch_short_positions_selenium was run instead")
                    self.fetch_short_positions_selenium(driver)

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
    def fetch_short_positions(short_data):
        short_codes = []
        users_to_notify = set()
        with transaction.atomic():
            for short in short_data:
                short_codes.append(short.stock.code)

                timestamp_start = short.timestamp.replace(microsecond=0)
                timestamp_end = timestamp_start + timedelta(seconds=1)

                existing_short = ShortPosition.objects.filter(
                    stock=short.stock,
                    value=short.value,
                    timestamp__gte=timestamp_start,
                    timestamp__lt=timestamp_end,
                ).first()

                if existing_short is None:
                    prev_short_position = ShortPosition.objects.filter(stock=short.stock).order_by('-timestamp').first()
                    if prev_short_position:
                        short.prev_value = prev_short_position.value
                    short.save()
                    for app_user in short.stock.app_users.all():
                        users_to_notify.add(app_user)

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
            subquery = ShortPosition.objects.values('stock__code', 'stock__name') \
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
                                          prev_value=short.value,
                                          timestamp=timezone.now()).save()

                            Error.objects.create(message=f'Short position for {short.stock.symbol} got closed!'
                                                         f' Check if error.')

                            for app_user in short.stock.app_users.all():
                                users_to_notify.add(app_user)

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
        for app_user in users_to_notify:
            Command.send_push_notification(app_user)

    def fetch_short_positions_selenium(self, driver):
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

                self.fetch_short_positions(short_data)

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
            stock = Stock.objects.get(code=code)
        except Stock.DoesNotExist:
            stock = Stock(code=code, name=name, symbol=name[:20])
            stock.save()

        return stock

    @staticmethod
    def get_stock_for_announcement(issuer_name, announced_company_name):
        stock_name = issuer_name if issuer_name else announced_company_name

        try:
            return Stock.objects.get(name=stock_name)
        except Stock.DoesNotExist:
            try:
                if issuer_name:
                    return CompanyMap.objects.get(issuer_name=issuer_name).stock
                elif announced_company_name:
                    return CompanyMap.objects.get(announced_company_name=announced_company_name).stock
                else:
                    return None
            except CompanyMap.DoesNotExist:
                CompanyMap.objects.create(announced_company_name=announced_company_name,
                                          issuer_name=issuer_name)

                Error.objects.create(message=f'A new company was created and needs to be handled: {stock_name}')

                return None

    @staticmethod
    def get_seller_for_announcement(announced_company_name):
        try:
            return ShortSeller.objects.get(name=announced_company_name)
        except ShortSeller.DoesNotExist:
            ShortSeller.objects.create(name=announced_company_name)

            Error.objects.create(message=f'A new short seller was created: {announced_company_name}')

            return None

    @staticmethod
    def send_push_notification(app_user):
        try:
            if not app_user.invalid and app_user.fcm_token:
                current_time = datetime.now(copenhagen_timezone).time()

                # Define quiet hours
                quiet_start = datetime.now(copenhagen_timezone).replace(hour=21, minute=30).time()
                quiet_end = datetime.now(copenhagen_timezone).replace(hour=7, minute=30).time()

                if current_time >= quiet_start or current_time < quiet_end:
                    sound = None
                else:
                    sound = 'default'

                message = messaging.Message(
                    apns=messaging.APNSConfig(
                        payload=messaging.APNSPayload(
                            aps=messaging.Aps(
                                alert=messaging.ApsAlert(
                                    loc_key='YOUR_WATCHLIST_WAS_UPDATED',
                                ),
                                sound=None
                            )
                        )
                    ),
                    token=app_user.fcm_token,
                )
                if not DEBUG:
                    messaging.send(message)
                app_user.notifications_sent = app_user.notifications_sent + 1
                app_user.save()
        except UnregisteredError:
            Error.objects.create(message=f"FCM token doesn't exist: {app_user.user_id}")
            app_user.invalid = timezone.now()
            app_user.save()
        except InvalidArgumentError:
            Error.objects.create(message=f"FCM token is invalid: {app_user.user_id}")
            app_user.invalid = timezone.now()
            app_user.save()
