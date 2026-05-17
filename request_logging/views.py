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
    from datetime import timedelta
    from django.utils import timezone
    b = service.today_visit_buckets()
    y = service.today_visit_buckets(for_date=timezone.localdate() - timedelta(days=1))
    total = b['iphone'] | b['ipad'] | b['iwatch'] | b['web'] | b['app']
    total_y = y['iphone'] | y['ipad'] | y['iwatch'] | y['web'] | y['app']

    def fmt(today_set, yesterday_set):
        return f"{len(today_set)} ({len(yesterday_set)})"

    all_bot_names = set(b['bots_by_name'].keys()) | set(y['bots_by_name'].keys())

    return JsonResponse({
        'caption': "Today's unique visitors by platform (yesterday)",
        'headers': ['Platform', 'Visitors'],
        'data': [
            {'platform': 'iPhone', 'count': fmt(b['iphone'], y['iphone'])},
            {'platform': 'iPad', 'count': fmt(b['ipad'], y['ipad'])},
            {'platform': 'Apple Watch', 'count': fmt(b['iwatch'], y['iwatch'])},
            {'platform': 'Web', 'count': fmt(b['web'], y['web'])},
            {'platform': 'App (device unknown)', 'count': fmt(b['app'], y['app'])},
            {'platform': 'Total (any platform)', 'count': fmt(total, total_y)},
            {'platform': 'Bots (excluded above)', 'count': fmt(b['bots'], y['bots'])},
            *[
                {'platform': f'  Bot: {name}', 'count': fmt(b['bots_by_name'].get(name, set()), y['bots_by_name'].get(name, set()))}
                for name in sorted(all_bot_names, key=lambda n: -len(b['bots_by_name'].get(n, set())))
            ],
        ],
    })


@staff_member_required
def get_visits_by_section_table(_: HttpRequest) -> JsonResponse:
    from datetime import timedelta
    from django.utils import timezone
    from shorts.models import Stock
    from insider_transactions.models import InsiderIssuer
    b = service.today_visit_buckets()
    y = service.today_visit_buckets(for_date=timezone.localdate() - timedelta(days=1))
    all_pf_codes = set(b['price_flow_by_stock'].keys()) | set(y['price_flow_by_stock'].keys())
    all_cvrs = set(b['insider_detail_by_cvr'].keys()) | set(y['insider_detail_by_cvr'].keys())
    code_to_symbol = {
        s.code: s.symbol
        for s in Stock.objects.filter(code__in=all_pf_codes).only('code', 'symbol')
    }
    cvr_to_name = {
        i.cvr: i.name
        for i in InsiderIssuer.objects.filter(cvr__in=all_cvrs).only('cvr', 'name')
    }

    def fmt(today_set, yesterday_set):
        return f"{len(today_set)} ({len(yesterday_set)})"

    def row(section, today_set, yesterday_set):
        if not today_set:
            return None
        return {'section': section, 'count': fmt(today_set, yesterday_set)}

    # Collect all price flow codes from both days
    all_pf = sorted(all_pf_codes, key=lambda c: -len(b['price_flow_by_stock'].get(c, set())))
    all_insider = sorted(all_cvrs, key=lambda c: -len(b['insider_detail_by_cvr'].get(c, set())))

    rows = [
        row('iPhone \u2014 short sellers list', b['sellers_iphone'], y['sellers_iphone']),
        row('iPhone \u2014 short seller detail', b['sellers_iphone_detail'], y['sellers_iphone_detail']),
        row('Web \u2014 short sellers list', b['sellers_web'], y['sellers_web']),
        row('Web \u2014 short seller detail', b['sellers_web_detail'], y['sellers_web_detail']),
        row('Top lists', b['top_lists'], y['top_lists']),
        row('Insider list', b['insider_list'], y['insider_list']),
        row('FAQ', b['faq'], y['faq']),
        row('Help - short watch', b['help_short_watch'], y['help_short_watch']),
        row('Help - detail page', b['help_details'], y['help_details']),
        row('Help - sellers list', b['help_sellers_list'], y['help_sellers_list']),
        row('Help - seller detail', b['help_sellers_detail'], y['help_sellers_detail']),
        row('Help - insider list', b['help_insider_list'], y['help_insider_list']),
        row('Help - insider detail', b['help_insider_detail'], y['help_insider_detail']),
        *[
            row(f'Web \u2014 price flow: {code_to_symbol.get(code, code)}', b['price_flow_by_stock'].get(code, set()), y['price_flow_by_stock'].get(code, set()))
            for code in all_pf
        ],
        *[
            row(f'Insider detail: {cvr_to_name.get(cvr, cvr)}', b['insider_detail_by_cvr'].get(cvr, set()), y['insider_detail_by_cvr'].get(cvr, set()))
            for cvr in all_insider
        ],
    ]

    return JsonResponse({
        'caption': "Today's unique visitors by section (yesterday)",
        'headers': ['Section', 'Visitors'],
        'data': [r for r in rows if r is not None],
    })


@staff_member_required
def get_visits_by_analysis_table(_: HttpRequest) -> JsonResponse:
    from datetime import timedelta
    from django.utils import timezone
    b = service.today_visit_buckets()
    y = service.today_visit_buckets(for_date=timezone.localdate() - timedelta(days=1))
    t = service.analysis_all_time_unique_ips()

    def row(name, key):
        return {
            'analysis': name,
            'today': len(b[key]),
            'yesterday': len(y[key]),
            'total': len(t[key]),
        }

    rows = [
        row('Analysis overview', 'analysis_overview'),
        row('ZEAL analysis', 'zeal_analysis'),
        row('ZEAL cost analysis', 'zeal_cost_analysis'),
        row('GN analysis', 'gn_analysis'),
        row('BAVA analysis', 'bava_analysis'),
    ]

    return JsonResponse({
        'caption': "Unique visitors per analysis",
        'headers': ['Analysis', 'Today', 'Yesterday', 'Total'],
        'data': rows,
    })


# --- Tracking endpoints ------------------------------------------------------


def clicked(_: HttpRequest, code: str) -> HttpResponse:
    """No-op tracking endpoint logged by the request_logging middleware."""
    return HttpResponse(status=204)


def track_visit(_: HttpRequest, page: str) -> HttpResponse:
    """No-op endpoint hit by the SPA to log a page visit via request_logging middleware."""
    return HttpResponse(status=204)
