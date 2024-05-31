import ipaddress
from collections import defaultdict
from datetime import timedelta, datetime
from typing import List, Union

import pytz
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Avg, Q, Max
from django.db.models.functions import ExtractYear, ExtractMonth, ExtractDay, ExtractWeekDay, TruncDate
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response

from request_logging.models import RequestLog
from shorts.models import Stock

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')


def get_symbol(url, symbol_map):
    parts = url.split('/')
    last_part = parts[-1]
    try:
        return symbol_map[last_part]
    except KeyError:
        return last_part


@staff_member_required
def get_filter_options(_: Request) -> JsonResponse:
    years = RequestLog.objects.annotate(year=ExtractYear('timestamp')).values_list('year', flat=True) \
        .order_by('-year')

    return JsonResponse({
        'options': ['all'] + list(set(years))
    })


@staff_member_required
def get_total_requests(_: Request, year: str) -> JsonResponse:
    queryset = RequestLog.objects.all()

    if year.isnumeric():
        queryset = queryset.filter(timestamp__year=year)

    two_months_ago = datetime.now() - timedelta(days=60)
    pks = list(RequestLog.objects.filter(timestamp__lt=two_months_ago).values_list('pk', flat=True))[:5000]
    RequestLog.objects.filter(pk__in=pks).delete()

    return JsonResponse({
        'title': f'Total requests ({year})',
        'count': queryset.count(),
    })


@staff_member_required
def get_latest_request_timestamp(_: Request) -> JsonResponse:
    latest_request = RequestLog.objects.latest('timestamp')

    return JsonResponse({
        'title': f'Latest request',
        'count': latest_request.timestamp.astimezone(copenhagen_timezone).strftime("%Y-%m-%d, %H:%M"),
    })


@staff_member_required
def get_requested_urls_chart(_: Request, year: str) -> JsonResponse:
    queryset = RequestLog.objects.all()

    if year.isnumeric():
        queryset = queryset.filter(created_at__year=year)

    queryset = queryset.filter(
        Q(requested_url__iendswith="privacy-policy") |
        Q(requested_url__iendswith="terms-of-agreement") |
        Q(requested_url__iendswith="privatlivspolitik") |
        Q(requested_url__iendswith="aftalevilkaar") |
        Q(requested_url="http://localhost:8000/") |
        Q(requested_url="http://www.zirium.dk/") |
        Q(requested_url="https://www.zirium.dk/")
    )

    queryset = queryset.values('requested_url')\
        .annotate(count=Count('id')) \
        .annotate(max_timestamp=Max('timestamp')) \
        .order_by('-max_timestamp')

    modified_data = []
    for entry in list(queryset):
        modified_data.append({'requested_url': entry['requested_url'],
                              'count': entry['count'],
                              'max_timestamp': entry['max_timestamp'].astimezone(copenhagen_timezone)
                             .strftime("%Y-%m-%d, %H:%M")})

    return JsonResponse({
        'caption': f'List of requested_url ({year})',
        'headers': ['Requested URL', 'Count', 'Most recent lookup'],
        'data': modified_data
    })


def get_historic_chart(_: Request, year: str, prefix: str) -> JsonResponse:
    queryset = RequestLog.objects.all()

    if year.isnumeric():
        queryset = queryset.filter(created_at__year=year)

    queryset = queryset.filter(
        Q(requested_url__icontains=f"{prefix}/") &
        ~Q(requested_url__icontains=f"{prefix}/sellers/") &
        Q(requested_url__iregex=r'[0-9]+$')
    )

    queryset = queryset.values('requested_url')\
        .annotate(count=Count('id')) \
        .annotate(max_timestamp=Max('timestamp')) \
        .order_by('-max_timestamp')

    symbol_map = Stock.objects.all().values('code', 'name')
    code_to_symbol = {entry['code']: entry['name'] for entry in symbol_map}

    modified_data = []
    symbol_data = defaultdict(lambda: {'count': 0, 'max_timestamp': None})

    for entry in list(queryset):
        symbol = get_symbol(entry['requested_url'], code_to_symbol)
        count = entry['count']
        timestamp = entry['max_timestamp'].astimezone(copenhagen_timezone)

        if symbol_data[symbol]['max_timestamp'] is None or timestamp > symbol_data[symbol]['max_timestamp']:
            symbol_data[symbol]['max_timestamp'] = timestamp

        symbol_data[symbol]['count'] += count

    for symbol, data in symbol_data.items():
        modified_data.append({'symbol': symbol,
                              'count': data['count'],
                              'max_timestamp': data['max_timestamp'].strftime("%Y-%m-%d, %H:%M")})

    modified_data = sorted(modified_data, key=lambda x: x['max_timestamp'], reverse=True)

    return JsonResponse({
        'caption': f'List of historic data from {prefix} ({year})',
        'headers': ['Stock', 'Count', 'Most recent lookup'],
        'data': modified_data
    })


@staff_member_required
def get_pick_historic_chart(request: Request, year: str) -> JsonResponse:
    return get_historic_chart(request, year, "pick")


@staff_member_required
def get_watch_historic_chart(request: Request, year: str) -> JsonResponse:
    return get_historic_chart(request, year, "watch")


@staff_member_required
def get_unique_ips_today(_: Request) -> JsonResponse:
    today = timezone.now()
    queryset = RequestLog.objects.filter(timestamp__date=today.date()).values('client_ip')

    # Filter out private IPs
    queryset = [entry['client_ip'] for entry in queryset if not ipaddress.ip_address(entry['client_ip']).is_private]

    # Count distinct IPs
    distinct_ips = len(set(queryset))

    return JsonResponse({
        'title': f'Total IP\'s today',
        'count': distinct_ips,
    })


@staff_member_required
def get_avg_request_count(_: Request, year: str) -> JsonResponse:
    queryset = RequestLog.objects.values('client_ip').annotate(entry_count=Count('id'))

    if year.isnumeric():
        queryset = queryset.filter(timestamp__year=year)

    average_entry_count = queryset.aggregate(avg_entry_count=Avg('entry_count'))

    return JsonResponse({
        'title': f'Avg requests per IP ({year})',
        'count': int(average_entry_count['avg_entry_count']),
    })


@staff_member_required
def get_total_requests_today(_: Request) -> JsonResponse:
    today = timezone.now()
    queryset = RequestLog.objects.filter(timestamp__date=today.date())

    return JsonResponse({
        'title': f'Total requests today',
        'count': queryset.count(),
    })


@staff_member_required
def get_total_requests_today(_: Request) -> JsonResponse:
    today = timezone.now()
    queryset = RequestLog.objects.filter(timestamp__date=today.date())

    return JsonResponse({
        'title': f'Total requests today',
        'count': queryset.count(),
    })


@staff_member_required
def get_avg_request_today_count(_: Request) -> JsonResponse:
    queryset = RequestLog.objects.annotate(
        year=ExtractYear('timestamp'),
        month=ExtractMonth('timestamp'),
        day=ExtractDay('timestamp')
    ).values('client_ip', 'year', 'month', 'day').annotate(entry_count=Count('id'))

    average_entry_count = queryset.aggregate(avg_entry_count=Avg('entry_count'))

    return JsonResponse({
        'title': f'Avg requests per IP per day',
        'count': int(average_entry_count['avg_entry_count']),
    })


WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

COLOR_PRIMARY, COLOR_SECONDARY = 'rgba(33, 97, 140, 0.9)', 'rgba(161, 202, 193, 0.9)'


def _rotate_week(lst: List[Union[str, int]]) -> List[Union[str, int]]:
    week_day = timezone.now().isoweekday()
    return lst[(week_day + 1) % 7:] + lst[:(week_day + 1) % 7:]


@staff_member_required
def get_requests_week_chart(_: Request) -> JsonResponse:
    time_threshold = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6)
    queryset = RequestLog.objects.all().filter(timestamp__gte=time_threshold,
                                               timestamp__lte=timezone.now()
                                               .replace(hour=23, minute=59, second=59, microsecond=999999))

    queryset = queryset.annotate(week_day=ExtractWeekDay('timestamp')) \
        .values('week_day') \
        .annotate(count=Count('id'))

    this_week_values = [0] * 7
    for value in queryset:
        this_week_values[value['week_day'] - 1] = value['count']

    time_threshold_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=13)
    time_threshold_end = timezone.now().replace(hour=23, minute=59, second=59, microsecond=999999)- timedelta(days=7)

    queryset = RequestLog.objects.all().filter(timestamp__gte=time_threshold_start,
                                               timestamp__lte=time_threshold_end)

    queryset = queryset.annotate(week_day=ExtractWeekDay('timestamp')) \
        .values('week_day') \
        .annotate(count=Count('id'))

    last_week_values = [0] * 7
    for value in queryset:
        last_week_values[value['week_day'] - 1] = value['count']

    return JsonResponse({
        'title': f'Requests per day in week',
        'data': {
            'labels': _rotate_week(WEEK_DAYS)[:-1] + ['TODAY'],
            'datasets': [
                {
                    'label': 'Last week',
                    'data': _rotate_week(last_week_values),
                    'backgroundColor': COLOR_SECONDARY,
                    'borderColor': COLOR_SECONDARY,
                    'borderWidth': 1
                },
                {
                    'label': 'This week',
                    'data': _rotate_week(this_week_values),
                    'backgroundColor': COLOR_PRIMARY,
                    'borderColor': COLOR_PRIMARY,
                    'borderWidth': 1
                }
            ]
        },
    })


@staff_member_required
def get_request_per_hour_chart(request: Request) -> JsonResponse:
    today = timezone.now()

    queryset = RequestLog.objects.filter(timestamp__date=today.date()) \
        .values('timestamp__hour') \
        .annotate(count=Count('id')) \
        .order_by('timestamp__hour')

    labels = [str(hour) + ":00" for hour in range(24)]
    data_today = [0] * 24

    for entry in queryset:
        hour = entry['timestamp__hour']
        count = entry['count']
        data_today[hour] = count

    yesterday = today - timedelta(days=7)

    queryset = RequestLog.objects.filter(timestamp__date=yesterday.date()) \
        .values('timestamp__hour') \
        .annotate(count=Count('id')) \
        .order_by('timestamp__hour')

    labels = [str(hour) + ":00" for hour in range(24)]
    data_yesterday = [0] * 24

    for entry in queryset:
        hour = entry['timestamp__hour']
        count = entry['count']
        data_yesterday[hour] = count

    return JsonResponse({
        'title': 'Requests per Hour',
        'data': {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Week ago',
                    'data': data_yesterday,
                    'backgroundColor': COLOR_SECONDARY,
                    'borderColor': COLOR_SECONDARY,
                    'borderWidth': 1
                },
                {
                    'label': 'Today',
                    'data': data_today,
                    'backgroundColor': COLOR_PRIMARY,
                    'borderColor': COLOR_PRIMARY,
                    'borderWidth': 1
                }
            ]
        }
    })


@staff_member_required
def get_pick_request_per_hour_chart(request: Request) -> JsonResponse:
    today = timezone.now()

    queryset = RequestLog.objects.filter(timestamp__date=today.date(), requested_url__iendswith='pick') \
        .values('timestamp__hour') \
        .annotate(count=Count('id')) \
        .order_by('timestamp__hour')

    labels = [str(hour) + ":00" for hour in range(24)]
    data_today = [0] * 24

    for entry in queryset:
        hour = entry['timestamp__hour']
        count = entry['count']
        data_today[hour] = count

    yesterday = today - timedelta(days=7)

    queryset = RequestLog.objects.filter(timestamp__date=yesterday.date(),  requested_url__iendswith='pick') \
        .values('timestamp__hour') \
        .annotate(count=Count('id')) \
        .order_by('timestamp__hour')

    labels = [str(hour) + ":00" for hour in range(24)]
    data_yesterday = [0] * 24

    for entry in queryset:
        hour = entry['timestamp__hour']
        count = entry['count']
        data_yesterday[hour] = count

    return JsonResponse({
        'title': 'Pick requests per Hour',
        'data': {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Week ago',
                    'data': data_yesterday,
                    'backgroundColor': COLOR_SECONDARY,
                    'borderColor': COLOR_SECONDARY,
                    'borderWidth': 1
                },
                {
                    'label': 'Today',
                    'data': data_today,
                    'backgroundColor': COLOR_PRIMARY,
                    'borderColor': COLOR_PRIMARY,
                    'borderWidth': 1
                }
            ]
        }
    })


@staff_member_required
def get_watch_request_per_hour_chart(request: Request) -> JsonResponse:
    today = timezone.now()

    queryset = RequestLog.objects.filter(timestamp__date=today.date(), requested_url__iendswith='watch') \
        .values('timestamp__hour') \
        .annotate(count=Count('id')) \
        .order_by('timestamp__hour')

    labels = [str(hour) + ":00" for hour in range(24)]
    data_today = [0] * 24

    for entry in queryset:
        hour = entry['timestamp__hour']
        count = entry['count']
        data_today[hour] = count

    yesterday = today - timedelta(days=7)

    queryset = RequestLog.objects.filter(timestamp__date=yesterday.date(),  requested_url__iendswith='watch') \
        .values('timestamp__hour') \
        .annotate(count=Count('id')) \
        .order_by('timestamp__hour')

    labels = [str(hour) + ":00" for hour in range(24)]
    data_yesterday = [0] * 24

    for entry in queryset:
        hour = entry['timestamp__hour']
        count = entry['count']
        data_yesterday[hour] = count

    return JsonResponse({
        'title': 'Watch requests per Hour',
        'data': {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Week ago',
                    'data': data_yesterday,
                    'backgroundColor': COLOR_SECONDARY,
                    'borderColor': COLOR_SECONDARY,
                    'borderWidth': 1
                },
                {
                    'label': 'Today',
                    'data': data_today,
                    'backgroundColor': COLOR_PRIMARY,
                    'borderColor': COLOR_PRIMARY,
                    'borderWidth': 1
                }
            ]
        }
    })


def get_unique_ips_per_day_table(_: Request) -> JsonResponse:
    start_date = datetime(2024, 2, 6).date()
    queryset = RequestLog.objects.filter(timestamp__date__gt=start_date) \
        .annotate(date=TruncDate('timestamp')) \
        .exclude(Q(client_ip__istartswith='192.168.') |
                 Q(client_ip__istartswith='10.') |
                 Q(client_ip__istartswith='172.16.')) \
        .values('date') \
        .annotate(unique_ips=Count('client_ip', distinct=True)) \
        .order_by('-date')[:10]

    modified_data = []
    for entry in queryset:
        modified_data.append({
            'date': entry['date'].strftime("%Y-%m-%d"),
            'num_ips': entry['unique_ips']
        })

    return JsonResponse({
        'caption': 'List of unique IPs per day',
        'headers': ['Date', 'Count'],
        'data': modified_data
    })


@staff_member_required
def get_requested_advertisement(_: Request) -> JsonResponse:
    queryset = RequestLog.objects.all()

    queryset = queryset.filter(
        Q(requested_url__iendswith="stresstilbud_appeared_main/") |
        Q(requested_url__iendswith="stresstilbud_appeared_detail/") |
        Q(requested_url__iendswith="stresstilbud_clicked_main/") |
        Q(requested_url__iendswith="stresstilbud_clicked_detail/")
    )

    appeared = {}
    clicked = {}
    for entry in list(queryset):
        if entry.requested_url.endswith('stresstilbud_appeared_main/') or \
                entry.requested_url.endswith('stresstilbud_appeared_detail/'):
            appeared[entry.client_ip] = appeared.get(entry.client_ip, 0) + 1
        else:
            clicked[entry.client_ip] = clicked.get(entry.client_ip, 0) + 1

    return JsonResponse({
        'caption': 'Advertisement clicked',
        'headers': ['Type', 'Count'],
        'data': [{'type': 'Appeared', 'count': len(appeared.keys())}, {'type': 'Clicked', 'count': len(clicked.keys())}]
    })


@staff_member_required
def get_referer(_: Request) -> JsonResponse:
    time_threshold = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
    queryset = RequestLog.objects.filter(timestamp__date__gt=time_threshold).values('referer',
                                                                                    'requested_url', 'client_ip')

    referer = {}
    client_ips = []
    iwatch = 0
    iphone = 0
    ipad = 0
    web = 0
    for entry in list(queryset):
        if entry['client_ip'] not in client_ips:
            if "/iwatch/" in entry['requested_url']:
                iwatch += 1
                client_ips.append(entry['client_ip'])
            elif "/iphone/" in entry['requested_url']:
                iphone += 1
                client_ips.append(entry['client_ip'])
            elif "/ipad/" in entry['requested_url']:
                ipad += 1
                client_ips.append(entry['client_ip'])
            elif "/web/" in entry['requested_url']:
                web += 1
                client_ips.append(entry['client_ip'])

        if entry['referer'] == '' or 'zirium.dk' in entry['referer']:
            continue
        referer[entry['referer']] = referer.get(entry['referer'], 0) + 1

    referer_list = [{'referer': a, 'count': referer[a]} for a in referer.keys()]

    sorted_referer_list = sorted(referer_list, key=lambda x: x['count'], reverse=True)
    sorted_referer_list.append({'referer': 'iPhone', 'count': iphone})
    sorted_referer_list.append({'referer': 'iPad', 'count': ipad})
    sorted_referer_list.append({'referer': 'Watch', 'count': iwatch})
    sorted_referer_list.append({'referer': 'Web', 'count': web})


    return JsonResponse({
        'caption': 'Advertisement clicked',
        'headers': ['Referer', 'Count'],
        'data': sorted_referer_list
    })


def clicked(code: str):
    return Response(status=204)

# def get_unique_user_agents_per_day_chart(_: Request, year: str) -> JsonResponse:
#     queryset = RequestLog.objects.all()
#
#     if year.isnumeric():
#         queryset = queryset.filter(created_at__year=year)
#
#     queryset = queryset.annotate(date=TruncDate('timestamp')) \
#         .values('date') \
#         .annotate(unique_user_agents=Count('user_agent', distinct=True)) \
#         .order_by('-date')[:10]
#
#     modified_data = []
#     for entry in list(queryset):
#         modified_data.append({
#             'date': entry['date'].strftime("%Y-%m-%d"),
#             'num user agents': entry['unique_user_agents']
#         })
#
#     return JsonResponse({
#         'caption': f'List of unique user agents per day ({year})',
#         'headers': ['Date', 'Count'],
#         'data': modified_data
#     })
