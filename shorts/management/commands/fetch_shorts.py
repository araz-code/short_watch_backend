import time
from collections import defaultdict
from datetime import datetime, timedelta

from django.core.cache import cache
import pytz
import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Max, Count, Subquery, OuterRef
from django.utils import timezone
from firebase_admin.exceptions import InvalidArgumentError
from firebase_admin.messaging import UnregisteredError
from selenium import webdriver
from selenium.webdriver.common.by import By

from errors.models import Error
from request_logging.service import delete_old_logs, process_visits
from short_watch_backend.settings import FCM_SERVICE_ACCOUNT_FILE, DEBUG
from shorts.models import ShortPosition, RunStatus, LargeShortSelling, ShortPositionChart, Stock
from shorts.utils import parse_headline, parse_publication_date, get_stock_for_issuer, get_or_create_seller
from users.models import AppUser

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

            # Pre-fetch all existing rows once. We use the dict for prev_value
            # lookups, in-place updates, and to compute which rows are stale.
            existing_by_key = {
                (r.stock_id, r.name): r for r in LargeShortSelling.objects.all()
            }

            feed_keys = set()
            to_create = []
            to_update = []

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

                key = (stock.pk, parsed['seller_name'])
                feed_keys.add(key)

                existing_row = existing_by_key.get(key)
                prev_value = self.get_prev_value_for_large_selling(existing_row, published_date)

                if existing_row is not None:
                    existing_row.value = parsed['value']
                    existing_row.short_seller = seller
                    existing_row.date = published_date.date()
                    existing_row.prev_value = prev_value
                    to_update.append(existing_row)
                else:
                    to_create.append(LargeShortSelling(
                        stock=stock,
                        name=parsed['seller_name'],
                        business_id='',
                        value=parsed['value'],
                        short_seller=seller,
                        date=published_date.date(),
                        prev_value=prev_value,
                    ))

            if to_create:
                LargeShortSelling.objects.bulk_create(to_create)
            if to_update:
                LargeShortSelling.objects.bulk_update(
                    to_update,
                    ['value', 'short_seller', 'date', 'prev_value'],
                )

            stale_keys = set(existing_by_key) - feed_keys
            if stale_keys:
                LargeShortSelling.objects.filter(
                    pk__in=[existing_by_key[k].pk for k in stale_keys]
                ).delete()

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
            # Bulk-fetch each stock's most recent ShortPosition.value into a dict
            # so the per-row prev_value lookup below is a dict access, not a SELECT.
            stock_pks_in_batch = {s.stock.pk for s in short_data}
            latest_value_subq = ShortPosition.objects.filter(
                stock_id=OuterRef('pk')
            ).order_by('-timestamp').values('value')[:1]
            prev_value_by_stock = dict(
                Stock.objects.filter(pk__in=stock_pks_in_batch)
                .annotate(latest_value=Subquery(latest_value_subq))
                .values_list('pk', 'latest_value')
            )

            # Bulk-fetch existing positions in the union of per-row 1-second windows
            # so the duplicate check is set membership, not a SELECT per row.
            existing_position_keys = set()
            if short_data:
                window_starts = [s.timestamp.replace(microsecond=0) for s in short_data]
                window_min = min(window_starts)
                window_max = max(window_starts) + timedelta(seconds=1)
                existing_position_keys = {
                    (p.stock_id, p.timestamp.replace(microsecond=0), p.value)
                    for p in ShortPosition.objects.filter(
                        stock_id__in=stock_pks_in_batch,
                        timestamp__gte=window_min,
                        timestamp__lt=window_max,
                    )
                }

            # Bulk-fetch followers per stock so the per-row app_users.all() call
            # is a dict access. One query joins the m2m through table to AppUser.
            app_users_by_stock = defaultdict(list)
            stock_user_through = AppUser.stocks.through
            for row in stock_user_through.objects.filter(
                stock_id__in=stock_pks_in_batch
            ).select_related('appuser'):
                app_users_by_stock[row.stock_id].append(row.appuser)

            # Bulk-prefetch today's chart rows so per-row update_or_create
            # becomes dict lookups + bulk_create/bulk_update at the end.
            chart_now = timezone.now()
            chart_today_date = chart_now.date()
            existing_charts_by_stock = {
                c.stock_id: c
                for c in ShortPositionChart.objects.filter(
                    stock_id__in=stock_pks_in_batch, date=chart_today_date
                )
            }
            # Keyed by stock_pk so each stock lands in exactly one list. If the
            # batch contains the same stock twice we mutate the same in-memory
            # instance rather than appending it to both lists (which would
            # break bulk_update on backends that don't backfill pks, e.g.
            # MySQL).
            charts_to_create_by_pk = {}
            charts_to_update_by_pk = {}

            for short in short_data:
                short_codes.append(short.stock.code)

                timestamp_start = short.timestamp.replace(microsecond=0)
                duplicate_key = (short.stock.pk, timestamp_start, short.value)

                if duplicate_key not in existing_position_keys:
                    prev_value = prev_value_by_stock.get(short.stock.pk)
                    if prev_value is not None:
                        short.prev_value = prev_value
                    short.save()
                    for app_user in app_users_by_stock.get(short.stock.pk, ()):
                        try:
                            if app_user not in users_to_notify_dict:
                                users_to_notify_dict[app_user] = []
                            users_to_notify_dict[app_user].append(f'{short.stock.symbol} {short.value:.2f}%')
                        except Exception as e:
                            Error.objects.create(message=f'Exception occurred with add users_to_notify_dict 1: {str(e)[:400]}')

                stock_pk = short.stock.pk
                if stock_pk in charts_to_create_by_pk:
                    chart = charts_to_create_by_pk[stock_pk]
                    chart.value = short.value
                    chart.timestamp = chart_now
                elif stock_pk in charts_to_update_by_pk:
                    chart = charts_to_update_by_pk[stock_pk]
                    chart.value = short.value
                    chart.timestamp = chart_now
                else:
                    existing_chart = existing_charts_by_stock.get(stock_pk)
                    if existing_chart is not None:
                        existing_chart.value = short.value
                        existing_chart.timestamp = chart_now
                        charts_to_update_by_pk[stock_pk] = existing_chart
                    else:
                        charts_to_create_by_pk[stock_pk] = ShortPositionChart(
                            stock=short.stock,
                            date=chart_today_date,
                            value=short.value,
                            timestamp=chart_now,
                        )

            if charts_to_create_by_pk:
                ShortPositionChart.objects.bulk_create(list(charts_to_create_by_pk.values()))
            if charts_to_update_by_pk:
                ShortPositionChart.objects.bulk_update(
                    list(charts_to_update_by_pk.values()), ['value', 'timestamp']
                )
        with transaction.atomic():
            subquery = ShortPosition.objects.values('stock__code', 'stock__name') \
                .annotate(max_timestamp=Max('timestamp'))
            # Materialize the latest-per-stock rows once and filter to closure
            # candidates (stocks not in today's feed). select_related('stock')
            # avoids a per-row SELECT on every short.stock access below.
            closure_candidates = [
                s for s in ShortPosition.objects
                .filter(timestamp__in=subquery.values('max_timestamp'))
                .select_related('stock')
                if s.stock.code not in short_codes
            ]

            closure_chart_stock_pks = {s.stock.pk for s in closure_candidates}
            closure_stock_pks = {s.stock.pk for s in closure_candidates if s.value != 0}
            # Count ROWS (not distinct stock pks) to preserve original threshold
            # semantics: if distinct_stocks ever returns multiple rows for the
            # same stock (e.g. two stocks share the same max timestamp), the
            # original code counted each row.
            count_new_closed_shorts = sum(1 for s in closure_candidates if s.value != 0)

            # Prefetch followers for stocks that will be closed, so the loop
            # below does dict lookups instead of per-row m2m SELECTs.
            closure_app_users_by_stock = defaultdict(list)
            if closure_stock_pks:
                for row in stock_user_through.objects.filter(
                    stock_id__in=closure_stock_pks
                ).select_related('appuser'):
                    closure_app_users_by_stock[row.stock_id].append(row.appuser)

            # Bulk-prefetch today's chart rows for closure stocks (broader set
            # than closure_stock_pks: includes already-zero stocks that still
            # get a 0.0 chart upsert).
            closure_chart_now = timezone.now()
            closure_chart_today_date = closure_chart_now.date()
            closure_existing_charts_by_stock = {
                c.stock_id: c
                for c in ShortPositionChart.objects.filter(
                    stock_id__in=closure_chart_stock_pks, date=closure_chart_today_date
                )
            }
            # Keyed by stock_pk: if a stock appears twice in closure_candidates
            # (e.g. duplicate ShortPosition rows at the same timestamp) we keep
            # exactly one chart instance in exactly one list.
            closure_charts_to_create_by_pk = {}
            closure_charts_to_update_by_pk = {}

            if count_new_closed_shorts > 5:
                Error.objects.create(message=f'An unexpected number of shorts got closed: '
                                             f'{count_new_closed_shorts}. Most be an error.')
            else:
                for short in closure_candidates:
                    if short.value != 0:
                        ShortPosition(stock=short.stock,
                                      value=0.0,
                                      prev_value=short.value,
                                      timestamp=timezone.now()).save()

                        Error.objects.create(message=f'Short position for {short.stock.symbol} got closed!'
                                                     f' Check if error.')

                        for app_user in closure_app_users_by_stock.get(short.stock.pk, ()):
                            try:
                                if app_user not in users_to_notify_dict:
                                    users_to_notify_dict[app_user] = []
                                users_to_notify_dict[app_user].append(f'{short.stock.symbol} 0.00%')
                            except Exception as e:
                                Error.objects.create(message=f'Exception occurred with add users_to_notify_dict 2: {str(e)[:400]}')

                    stock_pk = short.stock.pk
                    if (stock_pk in closure_charts_to_create_by_pk
                            or stock_pk in closure_charts_to_update_by_pk):
                        # Already queued for this stock — closure value is
                        # always 0.0, so no mutation is needed for repeats.
                        continue
                    existing_chart = closure_existing_charts_by_stock.get(stock_pk)
                    if existing_chart is not None:
                        existing_chart.value = 0.0
                        existing_chart.timestamp = closure_chart_now
                        closure_charts_to_update_by_pk[stock_pk] = existing_chart
                    else:
                        closure_charts_to_create_by_pk[stock_pk] = ShortPositionChart(
                            stock=short.stock,
                            date=closure_chart_today_date,
                            value=0.0,
                            timestamp=closure_chart_now,
                        )

                if closure_charts_to_create_by_pk:
                    ShortPositionChart.objects.bulk_create(
                        list(closure_charts_to_create_by_pk.values())
                    )
                if closure_charts_to_update_by_pk:
                    ShortPositionChart.objects.bulk_update(
                        list(closure_charts_to_update_by_pk.values()),
                        ['value', 'timestamp'],
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
    def get_prev_value_for_large_selling(existing_row, date):
        """Compute the new prev_value for a LargeShortSelling row update.

        ``existing_row`` is the prior row for the (stock, seller_name) pair,
        or None if none exists. ``date`` is the new publication datetime.

        - No prior row → None
        - Prior row from the same calendar day → keep its existing prev_value
        - Prior row from a different day → its current value becomes the new prev
        """
        if existing_row is None:
            return None
        if existing_row.date.strftime('%Y-%m-%d') == date.strftime('%Y-%m-%d'):
            return existing_row.prev_value
        return existing_row.value

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
