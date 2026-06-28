import ipaddress
import re
from collections import defaultdict
from datetime import timedelta, datetime
from functools import reduce
from operator import or_
from typing import List, Optional
from urllib.parse import urlparse, parse_qs

from django.db.models import Count, Max, Q
from django.db.models.functions import ExtractWeekDay, TruncDate
from django.utils import timezone

from request_logging.models import RequestLog
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
code_pattern = re.compile(r'/details/(\w+)', re.IGNORECASE)
version_pattern = re.compile(r'/(v\d+)')


def _analysis_visit_q() -> Q:
    """RequestLogs that feed the per-analysis dashboard table
    (analysis_all_time_unique_ips / analysis_all_time_view_counts).

    These are kept forever for now so the all-time view/visitor counts stay
    accurate, i.e. they are excluded from the age-based purge in
    delete_old_logs. Matches every '*-analysis' visit, the analysis overview,
    and the novo-dcf-share visits."""
    return (
        Q(requested_url__icontains='/stats/visit/') & (
            Q(requested_url__icontains='-analysis') |
            Q(requested_url__icontains='/stats/visit/analysis/') |
            Q(requested_url__icontains='/stats/visit/novo-dcf-share')
        )
    )


def delete_old_logs():
    two_months_ago = datetime.now() - timedelta(days=40)
    pks = list(
        RequestLog.objects.filter(timestamp__lt=two_months_ago)
        .exclude(_analysis_visit_q())
        .values_list('pk', flat=True)
    )[:20000]
    RequestLog.objects.filter(pk__in=pks).delete()

    pks = list(RequestLog.objects.filter(requested_url__iendswith='/status-check').values_list('pk', flat=True))[:5000]
    RequestLog.objects.filter(pk__in=pks).delete()

    pks = list(RequestLog.objects.filter(requested_url__icontains='.php').values_list('pk', flat=True))[:5000]
    RequestLog.objects.filter(pk__in=pks).delete()



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
    ).values('requested_url', 'client_ip') \
        .annotate(count=Count('id')) \
        .annotate(max_timestamp=Max('timestamp')) \
        .order_by('-max_timestamp')

    code_to_symbol = {entry['code']: entry['name']
                      for entry in Stock.objects.all().values('code', 'name')}

    aggregated = defaultdict(lambda: {'count': 0, 'ips': set(), 'max_timestamp': None})
    for entry in queryset:
        symbol = _symbol_for(entry['requested_url'], code_to_symbol)
        local_ts = timezone.localtime(entry['max_timestamp'])
        bucket = aggregated[symbol]
        if bucket['max_timestamp'] is None or local_ts > bucket['max_timestamp']:
            bucket['max_timestamp'] = local_ts
        bucket['count'] += entry['count']
        bucket['ips'].add(entry['client_ip'])

    rows = [
        {'symbol': symbol, 'count': data['count'], 'unique_ips': len(data['ips']), 'max_timestamp': data['max_timestamp']}
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


def analysis_all_time_unique_ips() -> dict:
    """All-time public client IPs per analysis page, bucketed by URL pattern.
    Bots and private IPs are excluded to match today_visit_buckets semantics."""
    queryset = RequestLog.objects.filter(requested_url__contains='/stats/visit/') \
        .values('requested_url', 'client_ip', 'user_agent')

    zeal_analysis = set()
    zeal_cost_analysis = set()
    gn_analysis = set()
    bava_analysis = set()
    novo_dcf_analysis = set()
    novo_dcf_share = set()
    pandora_silver_analysis = set()
    c25_analysis = set()
    ambu_analysis = set()
    obesity_analysis = set()
    netcompany_analysis = set()
    chemm_analysis = set()
    gn_priceflow_analysis = set()
    analysis_overview = set()

    for entry in queryset:
        ip = entry['client_ip']
        try:
            if ipaddress.ip_address(ip).is_private:
                continue
        except ValueError:
            continue
        if is_bot(entry['user_agent']):
            continue
        url = entry['requested_url']
        if "/stats/visit/zeal-analysis" in url:
            zeal_analysis.add(ip)
        if "/stats/visit/zeal-cost-analysis" in url:
            zeal_cost_analysis.add(ip)
        if "/stats/visit/gn-analysis" in url:
            gn_analysis.add(ip)
        if "/stats/visit/bava-analysis" in url:
            bava_analysis.add(ip)
        if "/stats/visit/novo-dcf-analysis" in url:
            novo_dcf_analysis.add(ip)
        if "/stats/visit/novo-dcf-share" in url:
            novo_dcf_share.add(ip)
        if "/stats/visit/pandora-silver-analysis" in url:
            pandora_silver_analysis.add(ip)
        if "/stats/visit/c25-analysis" in url:
            c25_analysis.add(ip)
        if "/stats/visit/ambu-analysis" in url:
            ambu_analysis.add(ip)
        if "/stats/visit/obesity-analysis" in url:
            obesity_analysis.add(ip)
        if "/stats/visit/netcompany-analysis" in url:
            netcompany_analysis.add(ip)
        if "/stats/visit/chemm-analysis" in url:
            chemm_analysis.add(ip)
        if "/stats/visit/gn-priceflow-analysis" in url:
            gn_priceflow_analysis.add(ip)
        if "/stats/visit/analysis/" in url:
            analysis_overview.add(ip)

    return {
        'zeal_analysis': zeal_analysis,
        'zeal_cost_analysis': zeal_cost_analysis,
        'gn_analysis': gn_analysis,
        'bava_analysis': bava_analysis,
        'novo_dcf_analysis': novo_dcf_analysis,
        'novo_dcf_share': novo_dcf_share,
        'pandora_silver_analysis': pandora_silver_analysis,
        'c25_analysis': c25_analysis,
        'ambu_analysis': ambu_analysis,
        'obesity_analysis': obesity_analysis,
        'netcompany_analysis': netcompany_analysis,
        'chemm_analysis': chemm_analysis,
        'gn_priceflow_analysis': gn_priceflow_analysis,
        'analysis_overview': analysis_overview,
    }


def analysis_all_time_view_counts() -> dict:
    """All-time total view counts per analysis page, bucketed by URL pattern.

    Unlike analysis_all_time_unique_ips this does NOT deduplicate by IP: every
    visit hit is counted, so a reader who opens an analysis five times counts as
    five views. Bots are still excluded (by user agent, not IP)."""
    queryset = RequestLog.objects.filter(requested_url__contains='/stats/visit/') \
        .values('requested_url', 'user_agent')

    counts = {
        'zeal_analysis': 0,
        'zeal_cost_analysis': 0,
        'gn_analysis': 0,
        'bava_analysis': 0,
        'novo_dcf_analysis': 0,
        'novo_dcf_share': 0,
        'pandora_silver_analysis': 0,
        'c25_analysis': 0,
        'ambu_analysis': 0,
        'obesity_analysis': 0,
        'netcompany_analysis': 0,
        'chemm_analysis': 0,
        'gn_priceflow_analysis': 0,
        'analysis_overview': 0,
    }

    for entry in queryset:
        if is_bot(entry['user_agent']):
            continue
        url = entry['requested_url']
        if "/stats/visit/zeal-analysis" in url:
            counts['zeal_analysis'] += 1
        if "/stats/visit/zeal-cost-analysis" in url:
            counts['zeal_cost_analysis'] += 1
        if "/stats/visit/gn-analysis" in url:
            counts['gn_analysis'] += 1
        if "/stats/visit/bava-analysis" in url:
            counts['bava_analysis'] += 1
        if "/stats/visit/novo-dcf-analysis" in url:
            counts['novo_dcf_analysis'] += 1
        if "/stats/visit/novo-dcf-share" in url:
            counts['novo_dcf_share'] += 1
        if "/stats/visit/pandora-silver-analysis" in url:
            counts['pandora_silver_analysis'] += 1
        if "/stats/visit/c25-analysis" in url:
            counts['c25_analysis'] += 1
        if "/stats/visit/ambu-analysis" in url:
            counts['ambu_analysis'] += 1
        if "/stats/visit/obesity-analysis" in url:
            counts['obesity_analysis'] += 1
        if "/stats/visit/netcompany-analysis" in url:
            counts['netcompany_analysis'] += 1
        if "/stats/visit/chemm-analysis" in url:
            counts['chemm_analysis'] += 1
        if "/stats/visit/gn-priceflow-analysis" in url:
            counts['gn_priceflow_analysis'] += 1
        if "/stats/visit/analysis/" in url:
            counts['analysis_overview'] += 1

    return counts


def today_visit_buckets(for_date=None) -> dict:
    """Public client IPs for a given date, bucketed by URL pattern (platform/section)."""
    if for_date is None:
        for_date = timezone.localdate()
    queryset = RequestLog.objects.filter(timestamp__date=for_date) \
        .values('requested_url', 'client_ip', 'user_agent')

    iphone, ipad, iwatch, web, app = set(), set(), set(), set(), set()
    sellers_iphone, sellers_iphone_detail = set(), set()
    sellers_web, sellers_web_detail = set(), set()
    top_lists, faq = set(), set()
    help_short_watch, help_details = set(), set()
    help_sellers_list, help_sellers_detail = set(), set()
    price_flow_by_stock = {}  # code -> set of IPs
    insider_list = set()
    insider_detail_by_cvr = {}  # cvr -> set of IPs
    help_insider_list, help_insider_detail = set(), set()
    zeal_analysis = set()
    zeal_cost_analysis = set()
    gn_analysis = set()
    bava_analysis = set()
    novo_dcf_analysis = set()
    novo_dcf_share = set()
    pandora_silver_analysis = set()
    c25_analysis = set()
    ambu_analysis = set()
    obesity_analysis = set()
    netcompany_analysis = set()
    chemm_analysis = set()
    gn_priceflow_analysis = set()
    analysis_overview = set()
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
        if "/stats/visit/help-short-sellers" in url:
            help_sellers_list.add(ip)
        if "/stats/visit/help-seller-details" in url:
            help_sellers_detail.add(ip)
        if "/stats/visit/price-flow/" in url:
            parts = url.rstrip('/').split('/')
            code = parts[-1] if parts else 'unknown'
            price_flow_by_stock.setdefault(code, set()).add(ip)
        if "/stats/visit/insider-list" in url:
            insider_list.add(ip)
        if "/stats/visit/insider-detail/" in url:
            parts = url.rstrip('/').split('/')
            cvr = parts[-1] if parts else 'unknown'
            insider_detail_by_cvr.setdefault(cvr, set()).add(ip)
        if "/stats/visit/help-insider-list" in url:
            help_insider_list.add(ip)
        if "/stats/visit/help-insider-detail" in url:
            help_insider_detail.add(ip)
        if "/stats/visit/zeal-analysis" in url:
            zeal_analysis.add(ip)
        if "/stats/visit/zeal-cost-analysis" in url:
            zeal_cost_analysis.add(ip)
        if "/stats/visit/gn-analysis" in url:
            gn_analysis.add(ip)
        if "/stats/visit/bava-analysis" in url:
            bava_analysis.add(ip)
        if "/stats/visit/novo-dcf-analysis" in url:
            novo_dcf_analysis.add(ip)
        if "/stats/visit/novo-dcf-share" in url:
            novo_dcf_share.add(ip)
        if "/stats/visit/pandora-silver-analysis" in url:
            pandora_silver_analysis.add(ip)
        if "/stats/visit/c25-analysis" in url:
            c25_analysis.add(ip)
        if "/stats/visit/ambu-analysis" in url:
            ambu_analysis.add(ip)
        if "/stats/visit/obesity-analysis" in url:
            obesity_analysis.add(ip)
        if "/stats/visit/netcompany-analysis" in url:
            netcompany_analysis.add(ip)
        if "/stats/visit/chemm-analysis" in url:
            chemm_analysis.add(ip)
        if "/stats/visit/gn-priceflow-analysis" in url:
            gn_priceflow_analysis.add(ip)
        if "/stats/visit/analysis/" in url:
            analysis_overview.add(ip)

    return {
        'iphone': iphone, 'ipad': ipad, 'iwatch': iwatch, 'web': web, 'app': app,
        'sellers_iphone': sellers_iphone, 'sellers_iphone_detail': sellers_iphone_detail,
        'sellers_web': sellers_web, 'sellers_web_detail': sellers_web_detail,
        'top_lists': top_lists, 'faq': faq,
        'help_short_watch': help_short_watch, 'help_details': help_details,
        'help_sellers_list': help_sellers_list, 'help_sellers_detail': help_sellers_detail,
        'price_flow_by_stock': price_flow_by_stock,
        'insider_list': insider_list,
        'insider_detail_by_cvr': insider_detail_by_cvr,
        'help_insider_list': help_insider_list,
        'help_insider_detail': help_insider_detail,
        'zeal_analysis': zeal_analysis,
        'zeal_cost_analysis': zeal_cost_analysis,
        'gn_analysis': gn_analysis,
        'bava_analysis': bava_analysis,
        'novo_dcf_analysis': novo_dcf_analysis,
        'novo_dcf_share': novo_dcf_share,
        'pandora_silver_analysis': pandora_silver_analysis,
        'c25_analysis': c25_analysis,
        'ambu_analysis': ambu_analysis,
        'obesity_analysis': obesity_analysis,
        'netcompany_analysis': netcompany_analysis,
        'chemm_analysis': chemm_analysis,
        'gn_priceflow_analysis': gn_priceflow_analysis,
        'analysis_overview': analysis_overview,
        'bots': bots, 'bots_by_name': bots_by_name,
    }
