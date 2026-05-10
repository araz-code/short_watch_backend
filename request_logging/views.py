from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpRequest, HttpResponse, JsonResponse

from request_logging import service

COLOR_PRIMARY = 'rgba(33, 97, 140, 0.9)'
COLOR_SECONDARY = 'rgba(161, 202, 193, 0.9)'


def _bar_chart_payload(title, labels, primary_label, primary_data,
                       comparison_label, comparison_data):
    return {
        'title': title,
        'data': {
            'labels': labels,
            'datasets': [
                {
                    'label': comparison_label,
                    'data': comparison_data,
                    'backgroundColor': COLOR_SECONDARY,
                    'borderColor': COLOR_SECONDARY,
                    'borderWidth': 1,
                },
                {
                    'label': primary_label,
                    'data': primary_data,
                    'backgroundColor': COLOR_PRIMARY,
                    'borderColor': COLOR_PRIMARY,
                    'borderWidth': 1,
                },
            ],
        },
    }


# --- Stat cards --------------------------------------------------------------


@staff_member_required
def get_total_requests(_: HttpRequest) -> JsonResponse:
    return JsonResponse({
        'title': 'Total requests',
        'count': service.count_total_requests(),
    })


@staff_member_required
def get_total_requests_today(_: HttpRequest) -> JsonResponse:
    return JsonResponse({
        'title': 'Total requests today',
        'count': service.count_total_requests_today(),
    })


@staff_member_required
def get_unique_ips_today(_: HttpRequest) -> JsonResponse:
    return JsonResponse({
        'title': "Total IP's today",
        'count': service.count_unique_ips_today(),
    })


@staff_member_required
def get_latest_request_timestamp(_: HttpRequest) -> JsonResponse:
    return JsonResponse({
        'title': 'Latest request',
        'count': service.latest_request_local().strftime(service.LOCAL_TIME_FORMAT),
    })


# --- Charts ------------------------------------------------------------------


@staff_member_required
def get_requests_week_chart(_: HttpRequest) -> JsonResponse:
    this_week, last_week = service.requests_per_weekday_this_vs_last_week()
    labels = service.rotate_week(service.WEEK_DAYS)[:-1] + ['TODAY']
    return JsonResponse(_bar_chart_payload(
        title='Requests per day in week',
        labels=labels,
        primary_label='This week',
        primary_data=service.rotate_week(this_week),
        comparison_label='Last week',
        comparison_data=service.rotate_week(last_week),
    ))


def _hourly_chart(title: str, suffix=None) -> JsonResponse:
    today_data, week_ago_data = service.requests_per_hour_today_vs_week_ago(suffix)
    labels = [f"{hour}:00" for hour in range(24)]
    return JsonResponse(_bar_chart_payload(
        title=title,
        labels=labels,
        primary_label='Today',
        primary_data=today_data,
        comparison_label='Week ago',
        comparison_data=week_ago_data,
    ))


@staff_member_required
def get_request_per_hour_chart(_: HttpRequest) -> JsonResponse:
    return _hourly_chart('Requests per Hour')


@staff_member_required
def get_pick_request_per_hour_chart(_: HttpRequest) -> JsonResponse:
    return _hourly_chart('Pick requests per Hour', suffix='pick')


@staff_member_required
def get_watch_request_per_hour_chart(_: HttpRequest) -> JsonResponse:
    return _hourly_chart('Watch requests per Hour', suffix='watch')


# --- Tables ------------------------------------------------------------------


@staff_member_required
def get_static_pages_table(_: HttpRequest) -> JsonResponse:
    rows = service.static_page_hits()
    return JsonResponse({
        'caption': 'Static page hits',
        'headers': ['Requested URL', 'Count', 'Most recent lookup'],
        'data': [
            {
                'requested_url': r['requested_url'],
                'count': r['count'],
                'max_timestamp': r['max_timestamp'].strftime(service.LOCAL_TIME_FORMAT),
            }
            for r in rows
        ],
    })


def _history_table(prefix: str) -> JsonResponse:
    rows = service.history_by_symbol(prefix)
    return JsonResponse({
        'caption': f'{prefix.capitalize()} history by stock today',
        'headers': ['Stock', 'Count', 'Unique IPs', 'Most recent lookup'],
        'data': [
            {
                'symbol': r['symbol'],
                'count': r['count'],
                'unique_ips': r['unique_ips'],
                'max_timestamp': r['max_timestamp'].strftime(service.LOCAL_TIME_FORMAT),
            }
            for r in rows
        ],
    })


@staff_member_required
def get_pick_history_table(_: HttpRequest) -> JsonResponse:
    return _history_table("pick")


@staff_member_required
def get_watch_history_table(_: HttpRequest) -> JsonResponse:
    return _history_table("watch")


@staff_member_required
def get_unique_ips_per_day_table(_: HttpRequest) -> JsonResponse:
    rows = service.unique_ips_per_day()
    return JsonResponse({
        'caption': 'List of unique IPs per day',
        'headers': ['Date', 'Count'],
        'data': [
            {'date': r['date'].strftime("%Y-%m-%d"), 'num_ips': r['num_ips']}
            for r in rows
        ],
    })


@staff_member_required
def get_versions_table(_: HttpRequest) -> JsonResponse:
    rows = service.versions_called()
    return JsonResponse({
        'caption': 'Versions called today',
        'headers': ['Version', 'Platform', 'Count', 'Unique IPs', 'Most recent call'],
        'data': [
            {
                'version': r['version'],
                'platform': r['platform'],
                'count': r['count'],
                'unique_ips': r['unique_ips'],
                'max_timestamp': r['max_timestamp'].strftime(service.LOCAL_TIME_FORMAT),
            }
            for r in rows
        ],
    })


@staff_member_required
def get_referers_table(_: HttpRequest) -> JsonResponse:
    rows = service.referers_called()
    return JsonResponse({
        'caption': 'External referers today',
        'headers': ['Host', 'Count', 'Unique IPs', 'Most recent hit', 'Pages'],
        'data': [
            {
                'host': r['host'],
                'count': r['count'],
                'unique_ips': r['unique_ips'],
                'max_timestamp': r['max_timestamp'].strftime(service.LOCAL_TIME_FORMAT),
                'pages': '\n'.join(f'{path} ({count})' for path, count in r['pages']),
            }
            for r in rows
        ],
    })


@staff_member_required
def get_visits_by_platform_table(_: HttpRequest) -> JsonResponse:
    b = service.today_visit_buckets()
    total = b['iphone'] | b['ipad'] | b['iwatch'] | b['web'] | b['app']
    return JsonResponse({
        'caption': "Today's unique visitors by platform",
        'headers': ['Platform', 'Visitors'],
        'data': [
            {'platform': 'iPhone', 'count': len(b['iphone'])},
            {'platform': 'iPad', 'count': len(b['ipad'])},
            {'platform': 'Apple Watch', 'count': len(b['iwatch'])},
            {'platform': 'Web', 'count': len(b['web'])},
            {'platform': 'App (device unknown)', 'count': len(b['app'])},
            {'platform': 'Total (any platform)', 'count': len(total)},
            {'platform': 'Bots (excluded above)', 'count': len(b['bots'])},
            *[
                {'platform': f'  Bot: {name}', 'count': len(ips)}
                for name, ips in sorted(b['bots_by_name'].items(), key=lambda x: -len(x[1]))
            ],
        ],
    })


@staff_member_required
def get_visits_by_section_table(_: HttpRequest) -> JsonResponse:
    from shorts.models import Stock
    from insider_transactions.models import InsiderIssuer
    b = service.today_visit_buckets()
    code_to_symbol = {
        s.code: s.symbol
        for s in Stock.objects.filter(code__in=b['price_flow_by_stock'].keys()).only('code', 'symbol')
    }
    cvr_to_name = {
        i.cvr: i.name
        for i in InsiderIssuer.objects.filter(cvr__in=b['insider_detail_by_cvr'].keys()).only('cvr', 'name')
    }
    return JsonResponse({
        'caption': "Today's unique visitors by section",
        'headers': ['Section', 'Visitors'],
        'data': [
            {'section': 'iPhone — short sellers list', 'count': len(b['sellers_iphone'])},
            {'section': 'iPhone — short seller detail', 'count': len(b['sellers_iphone_detail'])},
            {'section': 'Web — short sellers list', 'count': len(b['sellers_web'])},
            {'section': 'Web — short seller detail', 'count': len(b['sellers_web_detail'])},
            {'section': 'Top lists', 'count': len(b['top_lists'])},
            {'section': 'Insider list', 'count': len(b['insider_list'])},
            {'section': 'FAQ', 'count': len(b['faq'])},
            {'section': 'Help - short watch', 'count': len(b['help_short_watch'])},
            {'section': 'Help - detail page', 'count': len(b['help_details'])},
            {'section': 'Help - insider list', 'count': len(b['help_insider_list'])},
            {'section': 'Help - insider detail', 'count': len(b['help_insider_detail'])},
            *[
                {'section': f'Web — price flow: {code_to_symbol.get(code, code)}', 'count': len(ips)}
                for code, ips in sorted(b['price_flow_by_stock'].items(), key=lambda x: -len(x[1]))
            ],
            *[
                {'section': f'Insider detail: {cvr_to_name.get(cvr, cvr)}', 'count': len(ips)}
                for cvr, ips in sorted(b['insider_detail_by_cvr'].items(), key=lambda x: -len(x[1]))
            ],
        ],
    })


# --- Tracking endpoints ------------------------------------------------------


def clicked(_: HttpRequest, code: str) -> HttpResponse:
    """No-op tracking endpoint logged by the request_logging middleware."""
    return HttpResponse(status=204)


def track_visit(_: HttpRequest, page: str) -> HttpResponse:
    """No-op endpoint hit by the SPA to log a page visit via request_logging middleware."""
    return HttpResponse(status=204)
