import ipaddress
import json
import re
from collections import OrderedDict, defaultdict
from datetime import timedelta, datetime
from functools import reduce
from operator import or_
from typing import List, Optional
from urllib.parse import urlparse, parse_qs

from django.db import transaction, IntegrityError
from django.db.models import Count, Max, Q
from django.db.models.functions import ExtractWeekDay, TruncDate
from django.utils import timezone

from request_logging.models import VisitorLock, RequestLog, Visitor
from shorts.models import Stock

LOCAL_TIME_FORMAT = "%Y-%m-%d, %H:%M"

_BOT_UA_FRAGMENTS = (
    'googlebot', 'bingbot', 'msnbot', 'slurp',
    'duckduckbot', 'baiduspider', 'yandexbot',
    'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot', 'petalbot',
    'gptbot', 'chatgpt-user', 'claudebot', 'claude-web', 'anthropic-ai',
    'applebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'ia_archiver', 'archive.org_bot', 'scrapy', 'python-requests',
    'crawler', 'spider',
)


def is_bot(user_agent: str) -> bool:
    ua = user_agent.lower()
    return any(fragment in ua for fragment in _BOT_UA_FRAGMENTS)


def _no_bots_q() -> Q:
    """Q filter that excludes known bot user agents."""
    return ~reduce(or_, (Q(user_agent__icontains=f) for f in _BOT_UA_FRAGMENTS))


def _platform_urls_q() -> Q:
    """Q filter that restricts to real platform traffic (iPhone/iPad/Watch/Web)."""
    return (
        Q(requested_url__contains='/iphone/') |
        Q(requested_url__contains='/ipad/') |
        Q(requested_url__contains='/iwatch/') |
        Q(requested_url__contains='/web/') |
        # Web SPA pages and web-only API calls
        Q(requested_url__contains='/short-watch') |
        Q(requested_url__contains='/users/web-consent') |
        Q(requested_url__contains='/shorts/homepage-stats') |
        # App user/account endpoints (device not determinable from URL)
        Q(requested_url__contains='/users/register-token') |
        Q(requested_url__contains='/users/update-notification-status') |
        Q(requested_url__contains='/users/app-consent') |
        Q(requested_url__contains='/users/add-stock') |
        Q(requested_url__contains='/users/remove-stock') |
        Q(requested_url__contains='/users/status-check')
    )

WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

device_pattern = re.compile(r'/shorts/(web|iphone|ipad|iwatch)')
action_pattern = re.compile(r'/(watch|pick)')
code_pattern = re.compile(r'/details/(\w+)', re.IGNORECASE)
version_pattern = re.compile(r'/(v\d+)')
referer_pattern = re.compile(r'(google|facebook|proinvestor)')


def delete_old_logs():
    two_months_ago = datetime.now() - timedelta(days=40)
    pks = list(RequestLog.objects.filter(timestamp__lt=two_months_ago).values_list('pk', flat=True))[:20000]
    RequestLog.objects.filter(pk__in=pks).delete()

    pks = list(RequestLog.objects.filter(requested_url__iendswith='/status-check').values_list('pk', flat=True))[:5000]
    RequestLog.objects.filter(pk__in=pks).delete()

    pks = list(RequestLog.objects.filter(requested_url__icontains='.php').values_list('pk', flat=True))[:5000]
    RequestLog.objects.filter(pk__in=pks).delete()


def process_visits():
    with transaction.atomic():
        try:
            VisitorLock.objects.create()
        except IntegrityError:
            return

    try:
        queryset = RequestLog.objects.filter(processed=False).order_by('timestamp')[:15000]
        today = timezone.localdate()

        for request_log in queryset:
            device_match = device_pattern.search(request_log.requested_url)
            action_match = action_pattern.search(request_log.requested_url)
            code_match = code_pattern.search(request_log.requested_url)
            version_match = version_pattern.search(request_log.requested_url)
            referer_match = referer_pattern.search(request_log.referer)

            device = device_match.group(1) if device_match else None
            action = action_match.group(1) if action_match else None
            try:
                code = Stock.objects.get(code=code_match.group(1)).symbol if code_match else None
            except Stock.DoesNotExist:
                continue
            version = version_match.group(1) if version_match else None
            referer = referer_match.group(1) if referer_match else None

            visitor, created = Visitor.objects.get_or_create(
                client_ip=request_log.client_ip,
                defaults={
                    'first': request_log.timestamp,
                    'previous': request_log.timestamp,
                    'last': request_log.timestamp,
                    'visits': 1,
                    'visits_today': 1 if timezone.localtime(request_log.timestamp).date() == today else 0,
                    'watch': json.dumps({code: 1}) if action == 'watch' and code else '{}',
                    'pick': json.dumps({code: 1}) if action == 'pick' and code else '{}',
                    'web': request_log.timestamp if device == 'web' else None,
                    'visits_web': 1 if device == 'web' else 0,
                    'iphone': request_log.timestamp if device == 'iphone' else None,
                    'visits_iphone': 1 if device == 'iphone' else 0,
                    'ipad': request_log.timestamp if device == 'ipad' else None,
                    'visits_ipad': 1 if device == 'ipad' else 0,
                    'iwatch': request_log.timestamp if device == 'iwatch' else None,
                    'visits_iwatch': 1 if device == 'iwatch' else 0,
                    'version': version,
                    'referer': json.dumps({referer: 1}) if referer else '{}'
                }
            )

            if not created:
                visitor.visits_today = visitor.visits_today + 1 if timezone.localtime(request_log.timestamp).date() == today else 0
                if visitor.last - visitor.previous > timedelta(hours=1):
                    visitor.previous = visitor.last
                visitor.last = request_log.timestamp
                visitor.visits += 1

                if action == 'watch' and code:
                    visitor.watch = update_json_count(visitor.watch, code)
                if action == 'pick' and code:
                    visitor.pick= update_json_count(visitor.pick, code)

                visitor.web = request_log.timestamp if device == 'web' else visitor.web
                visitor.visits_web = visitor.visits_web + 1 if device == 'web' else visitor.visits_web
                visitor.iphone = request_log.timestamp if device == 'iphone' else visitor.iphone
                visitor.visits_iphone = visitor.visits_iphone + 1 if device == 'iphone' else visitor.visits_iphone
                visitor.ipad = request_log.timestamp if device == 'ipad' else visitor.ipad
                visitor.visits_ipad = visitor.visits_ipad + 1 if device == 'ipad' else visitor.visits_ipad
                visitor.iwatch = request_log.timestamp if device == 'iwatch' else visitor.iwatch
                visitor.visits_iwatch = visitor.visits_iwatch + 1 if device == 'iwatch' else visitor.visits_iwatch
                visitor.version = version
                if referer and referer:
                    visitor.referer = update_json_count(visitor.referer, referer)

            visitor.save()
            request_log.processed = True
            request_log.save()

        VisitorLock.objects.all().delete()
    finally:
        VisitorLock.objects.all().delete()


def update_json_count(field, code):
    field_dict = json.loads(field)
    field_dict[code] = field_dict.get(code, 0) + 1

    sorted_field_dict = OrderedDict(sorted(field_dict.items(), key=lambda item: item[1], reverse=True))

    return json.dumps(sorted_field_dict)


# --- Dashboard analytics -----------------------------------------------------
#
# Functions below feed the admin dashboard. Views in views.py are thin wrappers
# that format these results as JSON. Returns are plain Python data (ints, lists
# of dicts with datetime objects) so they're testable without HTTP.


def rotate_week(lst):
    """Rotate a 7-element list so that today ends up at the right edge."""
    week_day = timezone.localtime().isoweekday()
    return lst[(week_day + 1) % 7:] + lst[:(week_day + 1) % 7]


def count_total_requests() -> int:
    return RequestLog.objects.count()


def count_total_requests_today() -> int:
    return RequestLog.objects.filter(timestamp__date=timezone.localdate()).filter(_no_bots_q()).count()


def count_unique_ips_today() -> int:
    queryset = RequestLog.objects.filter(timestamp__date=timezone.localdate()) \
        .filter(_no_bots_q()).filter(_platform_urls_q()).values_list('client_ip', flat=True)
    public = {ip for ip in queryset if not ipaddress.ip_address(ip).is_private}
    return len(public)


def latest_request_local() -> datetime:
    return timezone.localtime(RequestLog.objects.latest('timestamp').timestamp)


_STATIC_PAGE_FILTERS = (
    Q(requested_url__iendswith="cookie-policy") |
    Q(requested_url__iendswith="privacy-policy") |
    Q(requested_url__iendswith="terms-of-agreement") |
    Q(requested_url__iendswith="privatlivspolitik") |
    Q(requested_url__iendswith="aftalevilkaar") |
    Q(requested_url="http://localhost:8000/") |
    Q(requested_url="http://www.zirium.dk/") |
    Q(requested_url="https://www.zirium.dk/")
)


def static_page_hits() -> list:
    """Per-URL count and most recent lookup for static-page hits."""
    queryset = RequestLog.objects.filter(_STATIC_PAGE_FILTERS, timestamp__date=timezone.localdate()).filter(_no_bots_q()) \
        .values('requested_url') \
        .annotate(count=Count('id')) \
        .annotate(max_timestamp=Max('timestamp')) \
        .order_by('-max_timestamp')
    return [
        {
            'requested_url': entry['requested_url'],
            'count': entry['count'],
            'max_timestamp': timezone.localtime(entry['max_timestamp']),
        }
        for entry in queryset
    ]


def _symbol_for(url: str, code_to_symbol: dict) -> str:
    last_part = url.split('/')[-1]
    return code_to_symbol.get(last_part, last_part)


def history_by_symbol(prefix: str) -> list:
    """Aggregate /pick/<n> or /watch/<n> hits by stock symbol."""
    queryset = RequestLog.objects.filter(
        Q(timestamp__date=timezone.localdate()) &
        Q(requested_url__icontains=f"{prefix}/") &
        ~Q(requested_url__icontains=f"{prefix}/sellers/") &
        Q(requested_url__iregex=r'[0-9]+$') &
        _no_bots_q()
    ).values('requested_url') \
        .annotate(count=Count('id')) \
        .annotate(max_timestamp=Max('timestamp')) \
        .order_by('-max_timestamp')

    code_to_symbol = {entry['code']: entry['name']
                      for entry in Stock.objects.all().values('code', 'name')}

    aggregated = defaultdict(lambda: {'count': 0, 'max_timestamp': None})
    for entry in queryset:
        symbol = _symbol_for(entry['requested_url'], code_to_symbol)
        local_ts = timezone.localtime(entry['max_timestamp'])
        bucket = aggregated[symbol]
        if bucket['max_timestamp'] is None or local_ts > bucket['max_timestamp']:
            bucket['max_timestamp'] = local_ts
        bucket['count'] += entry['count']

    rows = [
        {'symbol': symbol, 'count': data['count'], 'max_timestamp': data['max_timestamp']}
        for symbol, data in aggregated.items()
    ]
    rows.sort(key=lambda x: x['max_timestamp'], reverse=True)
    return rows


def _hourly_counts(date, suffix: Optional[str] = None) -> List[int]:
    queryset = RequestLog.objects.filter(timestamp__date=date).filter(_no_bots_q())
    if suffix:
        queryset = queryset.filter(requested_url__iendswith=suffix)
    queryset = queryset.values('timestamp__hour').annotate(count=Count('id')) \
        .order_by('timestamp__hour')
    data = [0] * 24
    for entry in queryset:
        data[entry['timestamp__hour']] = entry['count']
    return data


def requests_per_hour_today_vs_week_ago(suffix: Optional[str] = None):
    today = timezone.localdate()
    return _hourly_counts(today, suffix), _hourly_counts(today - timedelta(days=7), suffix)


def _weekday_counts(start, end) -> List[int]:
    queryset = RequestLog.objects.filter(timestamp__gte=start, timestamp__lte=end).filter(_no_bots_q()) \
        .annotate(week_day=ExtractWeekDay('timestamp')) \
        .values('week_day').annotate(count=Count('id'))
    data = [0] * 7
    for entry in queryset:
        data[entry['week_day'] - 1] = entry['count']
    return data


def requests_per_weekday_this_vs_last_week():
    local_now = timezone.localtime()
    today_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = local_now.replace(hour=23, minute=59, second=59, microsecond=999999)
    this_week = _weekday_counts(today_start - timedelta(days=6), today_end)
    last_week = _weekday_counts(today_start - timedelta(days=13), today_end - timedelta(days=7))
    return this_week, last_week


def unique_ips_per_day(days: int = 10) -> list:
    start_date = timezone.localdate() - timedelta(days=days)
    queryset = RequestLog.objects.filter(timestamp__date__gt=start_date).filter(_no_bots_q()) \
        .filter(_platform_urls_q()) \
        .annotate(date=TruncDate('timestamp')) \
        .exclude(Q(client_ip__istartswith='192.168.') |
                 Q(client_ip__istartswith='10.') |
                 Q(client_ip__istartswith='172.16.')) \
        .values('date') \
        .annotate(unique_ips=Count('client_ip', distinct=True)) \
        .order_by('-date')[:days]
    return [{'date': entry['date'], 'num_ips': entry['unique_ips']} for entry in queryset]


def versions_called() -> list:
    """Per-API-version request count, unique-IP count, and most recent hit,
    split into web vs app (iphone/ipad/iwatch). Sorted by version desc, web first."""
    queryset = RequestLog.objects.filter(
        requested_url__iregex=r'/v\d+/(shorts|users|sellers)/',
        timestamp__date=timezone.localdate(),
    ).filter(_no_bots_q()) \
        .values('requested_url', 'client_ip') \
        .annotate(count=Count('id')) \
        .annotate(max_timestamp=Max('timestamp'))

    aggregated = defaultdict(lambda: {'count': 0, 'ips': set(), 'max_timestamp': None})
    for entry in queryset:
        version_match = version_pattern.search(entry['requested_url'])
        if not version_match:
            continue
        version = version_match.group(1)

        device_match = device_pattern.search(entry['requested_url'])
        if device_match and device_match.group(1) == 'web':
            platform = 'web'
        elif device_match and device_match.group(1) in ('iphone', 'ipad', 'iwatch'):
            platform = 'app'
        else:
            platform = ''

        local_ts = timezone.localtime(entry['max_timestamp'])
        bucket = aggregated[(version, platform)]
        if bucket['max_timestamp'] is None or local_ts > bucket['max_timestamp']:
            bucket['max_timestamp'] = local_ts
        bucket['count'] += entry['count']
        bucket['ips'].add(entry['client_ip'])

    rows = [
        {
            'version': version,
            'platform': platform,
            'count': data['count'],
            'unique_ips': len(data['ips']),
            'max_timestamp': data['max_timestamp'],
        }
        for (version, platform), data in aggregated.items()
    ]
    rows.sort(key=lambda x: (-int(x['version'][1:]), x['platform']))
    return rows


_INTERNAL_REFERER_HOSTS = ('zirium.dk', 'localhost', '127.0.0.1')


def _referer_page_label(requested_url: str, stock_names: dict) -> str:
    """Display label for a landing page; resolves stock code → name when present."""
    try:
        parsed = urlparse(requested_url)
    except Exception:
        return requested_url
    path = parsed.path or requested_url

    code = None
    qs_code = parse_qs(parsed.query).get('code')
    if qs_code:
        code = qs_code[0]
    else:
        match = code_pattern.search(path)
        if match:
            code = match.group(1)

    if code:
        name = stock_names.get(code.upper()) or stock_names.get(code)
        if name:
            return f'{path}: {name}'
    return path


def referers_called() -> list:
    """External referer hosts with request count, unique-IP count, most
    recent hit, and the pages visitors landed on. Internal hosts
    (zirium.dk / localhost) are excluded."""
    queryset = RequestLog.objects.exclude(referer='') \
        .filter(timestamp__date=timezone.localdate()).filter(_no_bots_q()) \
        .values('referer', 'requested_url', 'client_ip') \
        .annotate(count=Count('id')) \
        .annotate(max_timestamp=Max('timestamp'))

    stock_names = dict(Stock.objects.values_list('code', 'name'))

    aggregated = defaultdict(lambda: {
        'count': 0,
        'ips': set(),
        'max_timestamp': None,
        'pages': defaultdict(int),
    })
    for entry in queryset:
        try:
            host = urlparse(entry['referer']).netloc.lower()
        except Exception:
            continue
        if not host or any(internal in host for internal in _INTERNAL_REFERER_HOSTS):
            continue
        local_ts = timezone.localtime(entry['max_timestamp'])
        bucket = aggregated[host]
        if bucket['max_timestamp'] is None or local_ts > bucket['max_timestamp']:
            bucket['max_timestamp'] = local_ts
        bucket['count'] += entry['count']
        bucket['ips'].add(entry['client_ip'])
        bucket['pages'][_referer_page_label(entry['requested_url'], stock_names)] += entry['count']

    rows = [
        {
            'host': host,
            'count': data['count'],
            'unique_ips': len(data['ips']),
            'max_timestamp': data['max_timestamp'],
            'pages': sorted(data['pages'].items(), key=lambda x: x[1], reverse=True),
        }
        for host, data in aggregated.items()
    ]
    rows.sort(key=lambda x: x['count'], reverse=True)
    return rows


def today_visit_buckets() -> dict:
    """Public client IPs for today, bucketed by URL pattern (platform/section)."""
    queryset = RequestLog.objects.filter(timestamp__date=timezone.localdate()) \
        .values('requested_url', 'client_ip', 'user_agent')

    iphone, ipad, iwatch, web, app = set(), set(), set(), set(), set()
    sellers_iphone, sellers_iphone_detail = set(), set()
    sellers_web, sellers_web_detail = set(), set()
    top_lists, faq = set(), set()
    help_short_watch, help_details = set(), set()
    price_flow_by_stock = {}  # code -> set of IPs
    bots = set()
    bots_by_name = {}  # fragment -> set of IPs

    for entry in queryset:
        ip = entry['client_ip']
        if ipaddress.ip_address(ip).is_private:
            continue
        url = entry['requested_url']

        if is_bot(entry['user_agent']):
            bots.add(ip)
            ua = entry['user_agent'].lower()
            for fragment in _BOT_UA_FRAGMENTS:
                if fragment in ua:
                    bots_by_name.setdefault(fragment, set()).add(ip)
                    break
            continue

        if "/iwatch/" in url:
            iwatch.add(ip)
        elif "/iphone/" in url:
            iphone.add(ip)
            if "/short-sellers/" in url:
                sellers_iphone_detail.add(ip)
            elif "/short-sellers" in url:
                sellers_iphone.add(ip)
        elif "/ipad/" in url:
            ipad.add(ip)
        elif "/web/" in url:
            web.add(ip)
            if "/short-sellers/" in url:
                sellers_web_detail.add(ip)
            elif "/short-sellers" in url:
                sellers_web.add(ip)
        elif "/short-watch" in url or "/users/web-consent" in url or "/shorts/homepage-stats" in url:
            web.add(ip)
        elif "/users/" in url:
            app.add(ip)

        if "/top-lists" in url:
            top_lists.add(ip)
        if "/stats/visit/faq" in url:
            faq.add(ip)
        if "/stats/visit/help-short-watch" in url:
            help_short_watch.add(ip)
        if "/stats/visit/help-details" in url:
            help_details.add(ip)
        if "/stats/visit/price-flow/" in url:
            parts = url.rstrip('/').split('/')
            code = parts[-1] if parts else 'unknown'
            price_flow_by_stock.setdefault(code, set()).add(ip)

    return {
        'iphone': iphone, 'ipad': ipad, 'iwatch': iwatch, 'web': web, 'app': app,
        'sellers_iphone': sellers_iphone, 'sellers_iphone_detail': sellers_iphone_detail,
        'sellers_web': sellers_web, 'sellers_web_detail': sellers_web_detail,
        'top_lists': top_lists, 'faq': faq,
        'help_short_watch': help_short_watch, 'help_details': help_details,
        'price_flow_by_stock': price_flow_by_stock,
        'bots': bots, 'bots_by_name': bots_by_name,
    }
