import re
import time
from datetime import datetime, timedelta

from django.core.cache import cache
import pytz
import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Max, Count
from django.utils import timezone
from firebase_admin.exceptions import InvalidArgumentError
from firebase_admin.messaging import UnregisteredError
from selenium import webdriver
from selenium.webdriver.common.by import By

from errors.models import Error
from request_logging.service import delete_old_logs, process_visits
from short_watch_backend.settings import ANNOUNCEMENT_API_KEY, FCM_SERVICE_ACCOUNT_FILE, DEBUG
from shorts.models import ShortPosition, RunStatus, LargeShortSelling, ShortPositionChart, Stock
from shorts.utils import parse_headline, parse_publication_date, get_stock_for_issuer, get_or_create_seller

import firebase_admin
from firebase_admin import credentials, messaging

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')

cred = credentials.Certificate(FCM_SERVICE_ACCOUNT_FILE)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

SEARCH_URL = 'https://appft.gold.extension.gopublic.dk/api/9217fa13-5d9a-46c6-9921-69ee7e6cfaf6/search'

SEARCH_HEADERS = {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://appft.gold.extension.gopublic.dk',
    'referer': 'https://appft.gold.extension.gopublic.dk/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
}


class Command(BaseCommand):
    help = "Fetches newest short positions data"

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
        driver = None
        try:
            driver = self._get_webdriver()
            self.fetch_short_positions_selenium(driver)
        except Exception as e:
            Error.objects.create(message=f'Selenium fetch failed: {str(e)}'[:500])
        finally:
            if driver is not None:
                try:
                    driver.quit()
                except Exception:
                    pass

        self.fetch_large_short_selling()
        self.remove_duplicate_positions()

        # Invalidate caches after new data
        cache.delete_many(['short_positions_list', 'short_sellers_list', 'homepage_stats', 'top_lists'])

        RunStatus.objects.filter(executed_at__lt=timezone.now() - timedelta(days=3)).delete()

        delete_old_logs()
        process_visits()

    def fetch_large_short_selling(self):
        try:
            body = {
                'query': '',
                'filters': [
                    {'type': 'dropdown', 'key': 'CategoryFilter', 'options': ['ShortSelling']},
                ],
                'page': 1,
                'pageSize': 100,
            }
            response = requests.post(SEARCH_URL, json=body, headers=SEARCH_HEADERS)

            if response.status_code != 200:
                Error.objects.create(message=f'Failed to fetch large sellers. Status: {response.status_code}')
                raise CommandError(f'API returned status {response.status_code}')

            rows = response.json()['data']['rows']

            LargeShortSelling.objects.all().update(delete=True)

            for row in rows:
                headline = row['HeadlineColumn']
                issuer_name = row['IssuerColumn']

                parsed = parse_headline(headline)
                if not parsed:
                    Error.objects.create(message=f'Could not parse seller headline: {headline[:450]}')
                    continue

                stock = get_stock_for_issuer(issuer_name)
                if not stock:
                    continue

                seller = get_or_create_seller(parsed['seller_name'])
                published_date = parse_publication_date(row['PublicationDateColumn'])

                prev_value = self.get_prev_value_for_large_selling(stock, parsed['seller_name'], published_date)

                LargeShortSelling.objects.update_or_create(
                    stock=stock,
                    name=parsed['seller_name'],
                    defaults={
                        'business_id': '',
                        'value': parsed['value'],
                        'short_seller': seller,
                        'date': published_date.date(),
                        'prev_value': prev_value,
                        'delete': False,
                    }
                )

            LargeShortSelling.objects.filter(delete=True).delete()

        except CommandError:
            raise
        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')

    @staticmethod
    def fetch_short_positions(short_data):
        short_codes = []
        users_to_notify_dict = {}

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
                        try:
                            if app_user not in users_to_notify_dict:
                                users_to_notify_dict[app_user] = []
                            users_to_notify_dict[app_user].append(f'{short.stock.symbol} {short.value:.2f}%')
                        except Exception as e:
                            Error.objects.create(message=f'Exception occurred with add users_to_notify_dict 1: {str(e)[:400]}')

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

            if count_new_closed_shorts > 30:
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
                                try:
                                    if app_user not in users_to_notify_dict:
                                        users_to_notify_dict[app_user] = []
                                    users_to_notify_dict[app_user].append(f'{short.stock.symbol} 0.00%')
                                except Exception as e:
                                    Error.objects.create(message=f'Exception occurred with add users_to_notify_dict 2: {str(e)[:400]}')

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
        for app_user, stocks in users_to_notify_dict.items():
            Command.send_push_notification(app_user, stocks)

    def fetch_short_positions_selenium(self, driver):
        retry_count = 0

        while retry_count < self.MAX_RETRIES:

            try:
                driver.get('https://www.finanstilsynet.dk/finansielle-temaer/kapitalmarked/selskabsmeddelelser/aggregerede-korte-nettopositioner')
                time.sleep(9)

                # Extract data from the new table structure
                isin_elements = driver.find_elements(By.CSS_SELECTOR, 'td[data-header="ISIN"] span')
                name_elements = driver.find_elements(By.CSS_SELECTOR, 'td[data-header="Udsteder"] span')
                percentage_elements = driver.find_elements(By.CSS_SELECTOR, 'td[data-header="Sum af korte nettopositioner (%)"] span')
                date_elements = driver.find_elements(By.CSS_SELECTOR, 'td[data-header="Senest rapporterede korte nettoposition"] span')

                parsed_rows = []
                for i in range(len(isin_elements)):
                    corrected_datetime = datetime.strptime(date_elements[i].text, '%d-%m-%Y %H:%M:%S')
                    code = isin_elements[i].text
                    name = name_elements[i].text
                    try:
                        value = float(percentage_elements[i].text.replace(',', '.'))
                    except ValueError:
                        continue
                    parsed_rows.append((code, name, value, corrected_datetime))

                stocks_by_code = self.get_or_create_stocks_bulk(
                    [(code, name) for code, name, _, _ in parsed_rows]
                )

                short_data = [
                    ShortPosition(stock=stocks_by_code[code],
                                  value=value,
                                  timestamp=copenhagen_timezone.localize(corrected_datetime))
                    for code, _, value, corrected_datetime in parsed_rows
                ]

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
    def get_or_create_stocks_bulk(pairs):
        """Resolve all (code, name) pairs to Stock instances in two queries max.

        Returns a dict {code: Stock}. Existing stocks are returned unchanged;
        missing ones are created with ``symbol = name[:20]``.
        """
        unique_pairs = {}
        for code, name in pairs:
            unique_pairs.setdefault(code, name)

        stocks_by_code = Stock.objects.in_bulk(list(unique_pairs.keys()), field_name='code')

        new_stocks = [
            Stock(code=code, name=name, symbol=name[:20])
            for code, name in unique_pairs.items()
            if code not in stocks_by_code
        ]
        if new_stocks:
            Stock.objects.bulk_create(new_stocks)
            for stock in new_stocks:
                stocks_by_code[stock.code] = stock

        return stocks_by_code

    @staticmethod
    def send_push_notification(app_user, stocks_changed):
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
                                    loc_args=[', '.join([stock for stock in stocks_changed])]
                                    if app_user.version in {'v16', 'v17'} else None,
                                ),
                                badge=1 if app_user.version in {'v13', 'v14', 'v15', 'v16', 'v17'} else 0,
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

    @staticmethod
    def get_prev_value_for_large_selling(stock, positions_holder, date):
        try:
            selling = LargeShortSelling.objects.get(stock=stock, name=positions_holder)

            if selling.date.strftime('%Y-%m-%d') == date.strftime('%Y-%m-%d'):
                return selling.prev_value
            else:
                return selling.value

        except LargeShortSelling.DoesNotExist:
            return None

    @staticmethod
    def remove_duplicate_positions():
        duplicates = (
            ShortPosition.objects
            .values('stock', 'timestamp')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
        )

        for dup in duplicates:
            entries = list(ShortPosition.objects.filter(
                stock=dup['stock'],
                timestamp=dup['timestamp'],
            ).select_related('stock').order_by('-id'))

            kept = entries[0]
            to_delete = entries[1:]
            deleted_values = ', '.join(str(e.value) for e in to_delete)

            Error.objects.create(
                message=f'Duplicate removed for {kept.stock.symbol} at {dup["timestamp"]}: '
                        f'kept {kept.value} (id={kept.id}), '
                        f'deleted {deleted_values}'[:500]
            )

            ShortPosition.objects.filter(id__in=[e.id for e in to_delete]).delete()
