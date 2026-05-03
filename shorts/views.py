import math
from collections import namedtuple
from datetime import timedelta, datetime, date

from django.core.cache import cache
from django.db.models import Max, Prefetch, Count
from django.utils import timezone
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, GenericViewSet
from rest_framework_api_key.permissions import HasAPIKey

from request_logging.models import RequestLog
from shorts.models import ShortPosition, Stock, LargeShortSelling, ShortPositionChart, ShortSeller, Announcement
from shorts.serializers import ShortPositionSerializer, ShortSellerSerializerOld, ShortPositionDetailSerializer, \
    ShortSellerListSerializer, ShortSellerDetailSerializer

# Max age for cached responses when fetch_shorts has not run cache.clear().
# fetch_shorts clears the cache whenever data actually changes; this timeout
# is the upper bound that keeps stale entries from sticking around forever.
CACHE_TIMEOUT_SECONDS = 20 * 60


class ShortPositionView(ReadOnlyModelViewSet):
    permission_classes = [HasAPIKey]
    serializer_class = ShortPositionSerializer
    queryset = ShortPosition.objects.all()
    lookup_field = 'code'

    def list(self, request, *args, **kwargs):
        cache_key = 'short_positions_list'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        stocks_with_latest_timestamp = Stock.objects.filter(active=True) \
            .annotate(latest_timestamp=Max('shortposition__timestamp'))

        most_recent_short_positions = ShortPosition.objects.select_related('stock').filter(
            stock__in=stocks_with_latest_timestamp,
            timestamp__in=stocks_with_latest_timestamp.values('latest_timestamp')
        )

        sorted_data = sorted(most_recent_short_positions, key=lambda x: x.stock.symbol)
        seen = set()
        sorted_data = [p for p in sorted_data if p.stock_id not in seen and not seen.add(p.stock_id)]

        serializer = self.serializer_class(sorted_data, many=True)
        cache.set(cache_key, serializer.data, timeout=CACHE_TIMEOUT_SECONDS)
        return Response(serializer.data)

    def retrieve(self, request, code=None, *args, **kwargs):
        short_positions_for_code = self.get_queryset().select_related('stock') \
            .filter(stock__code=code).order_by('-timestamp')

        serializer = self.serializer_class(short_positions_for_code, many=True)
        return Response(serializer.data)


class OldShortSellerView(GenericViewSet, RetrieveAPIView):
    queryset = LargeShortSelling.objects.all()
    serializer_class = ShortSellerSerializerOld
    permission_classes = [HasAPIKey]
    lookup_field = 'code'

    def retrieve(self, request, code=None, *args, **kwargs):
        sellers = self.get_queryset().filter(stock__code=code).order_by('-date')

        serializer = self.serializer_class(sellers, many=True)
        return Response(serializer.data)


ShortedStockDetailsResponse = namedtuple('ShortedStockDetailsResponse', ['chartValues', 'historic', 'sellers',
                                                                         'announcements',
                                                                         'percentileAllTime',
                                                                         'velocity7d',
                                                                         'velocity30d',
                                                                         'priceFlow',
                                                                         'sharesOutstanding',
                                                                         'avgShortPrice',
                                                                         'avgNetPrice'])


PRICE_FLOW_BUCKET_WIDTH = 0.02  # 2% wide log-spaced buckets


def _compute_price_flow(stock, chart_values):
    """Bucket the daily change in aggregate short interest by close-price.

    For each pair of consecutive non-null observations, compute the delta in
    shares short (delta_pct / 100 * shares_outstanding) and attribute it to
    the bucket containing the *previous* row's close. Rationale: under DFSA
    rules a position change must be disclosed by 15:30 the trading day after
    the trade, so a delta first visible on day N reflects trading executed
    on (approximately) day N-1, i.e. prev's close is closer to the actual
    fill price than cur's close. Positive deltas count as sharesShorted,
    negative deltas as sharesCovered.

    Returns [] if shares_outstanding is unknown or fewer than 2 usable rows.
    """
    shares_out = stock.shares_outstanding
    if not shares_out:
        return []

    rows = [
        cv for cv in chart_values
        if cv.value is not None and cv.close is not None and cv.close > 0
    ]
    def typical_price(cv):
        if cv.high is not None and cv.low is not None:
            return (cv.high + cv.low + cv.close) / 3
        return cv.close
    if len(rows) < 2:
        return []

    rows.sort(key=lambda cv: cv.date)

    log_step = math.log(1 + PRICE_FLOW_BUCKET_WIDTH)
    min_price = min(typical_price(cv) for cv in rows)

    buckets = {}
    prev = rows[0]
    for cur in rows[1:]:
        delta_pct = cur.value - prev.value
        delta_shares = delta_pct / 100.0 * shares_out
        price = typical_price(prev)
        idx = int(math.log(price / min_price) / log_step)
        b = buckets.setdefault(idx, {'shorted': 0.0, 'covered': 0.0,
                                      'last_shorted_date': None, 'last_covered_date': None})
        if delta_shares > 0:
            b['shorted'] += delta_shares
            if b['last_shorted_date'] is None or cur.date > b['last_shorted_date']:
                b['last_shorted_date'] = cur.date
        elif delta_shares < 0:
            b['covered'] += -delta_shares
            if b['last_covered_date'] is None or cur.date > b['last_covered_date']:
                b['last_covered_date'] = cur.date
        prev = cur

    result = []
    for idx in sorted(buckets):
        low = min_price * (1 + PRICE_FLOW_BUCKET_WIDTH) ** idx
        high = low * (1 + PRICE_FLOW_BUCKET_WIDTH)  # noqa: F841 (shadows outer high)
        result.append({
            'priceLow': round(low, 2),
            'priceHigh': round(high, 2),
            'sharesShorted': int(round(buckets[idx]['shorted'])),
            'sharesCovered': int(round(buckets[idx]['covered'])),
            'lastShortedDate': buckets[idx]['last_shorted_date'],
            'lastCoveredDate': buckets[idx]['last_covered_date'],
        })
    return result


def _compute_avg_short_price(price_flow):
    """Weighted average opening price across all price-flow buckets (shorted only)."""
    total_shorted = sum(b['sharesShorted'] for b in price_flow)
    if total_shorted == 0:
        return None
    weighted = sum((b['priceLow'] + b['priceHigh']) / 2 * b['sharesShorted'] for b in price_flow)
    return round(weighted / total_shorted, 2)


def _compute_avg_net_price(price_flow):
    """Price level where the most shares were shorted (peak of the shorted distribution)."""
    if not price_flow:
        return None
    peak = max(price_flow, key=lambda b: b['sharesShorted'])
    if peak['sharesShorted'] == 0:
        return None
    return round((peak['priceLow'] + peak['priceHigh']) / 2, 2)


def _compute_derived_metrics(chart_values, historic):
    """Compute percentile (0-100) and 7/30-day velocity from full history."""
    if historic:
        current_val = historic[0].value
    elif chart_values:
        current_val = chart_values[0].value
    else:
        return None, None, None

    if not chart_values:
        return None, None, None

    values = [cv.value for cv in chart_values]
    total = len(values)
    if total > 0:
        below = sum(1 for v in values if v < current_val)
        equal = sum(1 for v in values if v == current_val)
        percentile = (below + equal / 2) / total * 100
    else:
        percentile = None

    by_date = {cv.date: cv.value for cv in chart_values}
    latest_date = chart_values[0].date

    def value_on_or_before(target_date):
        cursor = target_date
        earliest = chart_values[-1].date
        while cursor >= earliest:
            if cursor in by_date:
                return by_date[cursor]
            cursor -= timedelta(days=1)
        return None

    val_7d = value_on_or_before(latest_date - timedelta(days=7))
    val_30d = value_on_or_before(latest_date - timedelta(days=30))
    velocity_7d = current_val - val_7d if val_7d is not None else None
    velocity_30d = current_val - val_30d if val_30d is not None else None

    return percentile, velocity_7d, velocity_30d


FIRST_ENTRY_DATE = date(2023, 11, 6)


class ShortPositionDetailView(GenericViewSet, RetrieveAPIView):
    queryset = ShortPosition.objects.all()
    serializer_class = ShortPositionDetailSerializer
    permission_classes = [HasAPIKey]
    lookup_field = 'code'

    def retrieve(self, request, code=None, *args, **kwargs):
        cache_key = f'detail_{code}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        try:
            stock = Stock.objects.prefetch_related(
                'shortposition_set',
                'shortpositionchart_set',
                Prefetch('largeshortselling_set',
                         queryset=LargeShortSelling.objects.select_related('stock', 'short_seller')),
                Prefetch('announcement_set',
                         queryset=Announcement.objects.select_related('stock')),
            ).get(code=code)

            CHART_START_OVERRIDES = {
                'DK0010311471': date(2025, 12, 3),  # Sydbank merged
            }

            historic_qs = stock.shortposition_set.all().order_by('-timestamp')
            if stock.code in CHART_START_OVERRIDES:
                historic_qs = historic_qs.filter(timestamp__date__gte=CHART_START_OVERRIDES[stock.code])
            historic = historic_qs[:100]

            chart_qs = stock.shortpositionchart_set.all()
            if stock.code in CHART_START_OVERRIDES:
                chart_qs = chart_qs.filter(date__gte=CHART_START_OVERRIDES[stock.code])
            chart_values = list(chart_qs.order_by('-date'))

            one_month_ago = datetime.now() - timedelta(days=30)
            announcements = stock.announcement_set.filter(published_date__gte=one_month_ago).order_by(
                '-published_date')

            effective_start = CHART_START_OVERRIDES.get(stock.code, FIRST_ENTRY_DATE)
            days_difference = (date.today() - effective_start).days

            missing_count = days_difference + 1 - len(chart_values)

            if missing_count > 0:
                earliest_date = chart_values[-1].date if chart_values else effective_start

                for i in range(missing_count):
                    missing_date = earliest_date - timedelta(days=i + 1)
                    if missing_date < effective_start:
                        break
                    missing_datetime = datetime.combine(missing_date, datetime.min.time(), tzinfo=timezone.utc)
                    chart_values.append(
                        ShortPositionChart(stock=stock, value=0, date=missing_date, timestamp=missing_datetime))

                chart_values = sorted(chart_values, key=lambda x: x.date, reverse=True)

            sellers = stock.largeshortselling_set.all().order_by('-date')

            percentile, velocity_7d, velocity_30d = _compute_derived_metrics(chart_values, historic)

            price_flow = _compute_price_flow(stock, chart_values)
            avg_short_price = _compute_avg_short_price(price_flow)
            avg_net_price = _compute_avg_net_price(price_flow)

            response = ShortedStockDetailsResponse(chart_values, historic, sellers, announcements,
                                                   percentile, velocity_7d, velocity_30d, price_flow,
                                                   stock.shares_outstanding, avg_short_price, avg_net_price)

            data = self.get_serializer(response).data
            cache.set(cache_key, data, timeout=CACHE_TIMEOUT_SECONDS)
            return Response(data)
        except Stock.DoesNotExist:
            return Response(self.get_serializer(
                ShortedStockDetailsResponse([], [], [], [], None, None, None, [], None, None, None)).data)


class ShortSellerView(ReadOnlyModelViewSet):
    queryset = ShortSeller.objects.prefetch_related(
        Prefetch('large_short_sellings', queryset=LargeShortSelling.objects.select_related('stock', 'short_seller')),
        Prefetch('announcements', queryset=Announcement.objects.select_related('stock')),
    ).filter(
        announcements__isnull=False,
        announcements__is_cancellation=False,
        announcements__published_date__gte=date(2023, 11, 6),
    ).distinct().order_by('name')
    serializer_class = ShortSellerListSerializer
    detail_serializer_class = ShortSellerDetailSerializer

    def list(self, request, *args, **kwargs):
        cache_key = 'short_sellers_list'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT_SECONDS)
        return response

    def get_serializer_class(self):
        if self.action == 'retrieve':
            if hasattr(self, 'detail_serializer_class'):
                return self.detail_serializer_class

        return self.serializer_class


import re
from rest_framework.decorators import api_view, permission_classes as perm


@api_view(['GET'])
@perm([HasAPIKey])
def stats_view(request):
    cached = cache.get('homepage_stats')
    if cached:
        return Response(cached)

    try:
        # 1. How many stocks are currently shorted (active stocks with position > 0)
        latest_positions = ShortPosition.objects.filter(
            stock__active=True
        ).values('stock').annotate(
            latest=Max('timestamp')
        )
        shorted_count = 0
        most_shorted = None
        most_shorted_value = 0
        latest_update = None
        for entry in latest_positions:
            pos = ShortPosition.objects.select_related('stock').filter(
                stock_id=entry['stock'], timestamp=entry['latest']
            ).first()
            if pos and pos.value > 0:
                shorted_count += 1
                if pos.value > most_shorted_value:
                    most_shorted_value = pos.value
                    most_shorted = pos.stock
                if latest_update is None or pos.timestamp > latest_update:
                    latest_update = pos.timestamp

        # 1b. Deltas vs. 7 days ago (freshness signal — works with daily-ish updates)
        seven_days_ago = timezone.now() - timedelta(days=7)
        prev_latest_positions = ShortPosition.objects.filter(
            stock__active=True,
            timestamp__lt=seven_days_ago,
        ).values('stock').annotate(latest=Max('timestamp'))
        prev_shorted_count = 0
        for entry in prev_latest_positions:
            pos = ShortPosition.objects.filter(
                stock_id=entry['stock'], timestamp=entry['latest']
            ).first()
            if pos and pos.value > 0:
                prev_shorted_count += 1

        most_shorted_prev_value = None
        if most_shorted:
            prev_pos = ShortPosition.objects.filter(
                stock=most_shorted,
                timestamp__lt=seven_days_ago,
            ).order_by('-timestamp').first()
            if prev_pos:
                most_shorted_prev_value = prev_pos.value

        # 2. Most viewed detail page in last month
        one_month_ago = timezone.now() - timedelta(days=30)
        code_pattern = re.compile(r'/details/(\S+)')
        detail_logs = list(RequestLog.objects.filter(
            requested_url__icontains='/details/',
            timestamp__gte=one_month_ago,
        ).values_list('requested_url', flat=True))

        view_counts = {}
        for url in detail_logs:
            match = code_pattern.search(url)
            if match:
                code = match.group(1).strip('/')
                view_counts[code] = view_counts.get(code, 0) + 1

        most_viewed_code = max(view_counts, key=view_counts.get) if view_counts else None
        most_viewed_stock = None
        most_viewed_count = 0
        if most_viewed_code:
            try:
                most_viewed_stock = Stock.objects.get(code=most_viewed_code)
                most_viewed_count = view_counts[most_viewed_code]
            except Stock.DoesNotExist:
                pass

        # 3. Most followed stock (by app users)
        most_followed = Stock.objects.annotate(
            follower_count=Count('app_users')
        ).order_by('-follower_count').first()

        data = {
            'shortedCount': shorted_count,
            'shortedCountDelta': (shorted_count - prev_shorted_count) if prev_shorted_count else None,
            'mostShorted': {
                'symbol': most_shorted.symbol,
                'name': most_shorted.name,
                'code': most_shorted.code,
                'value': most_shorted_value,
                'prevValue': most_shorted_prev_value,
            } if most_shorted else None,
            'mostViewed': {
                'symbol': most_viewed_stock.symbol,
                'name': most_viewed_stock.name,
                'code': most_viewed_stock.code,
                'views': most_viewed_count,
            } if most_viewed_stock else None,
            'mostFollowed': {
                'symbol': most_followed.symbol,
                'name': most_followed.name,
                'code': most_followed.code,
                'followers': most_followed.follower_count,
            } if most_followed and most_followed.follower_count > 0 else None,
            'updatedAt': latest_update.isoformat() if latest_update else None,
        }
        cache.set('homepage_stats', data, timeout=CACHE_TIMEOUT_SECONDS)
        return Response(data)
    except Exception:
        return Response({
            'shortedCount': 0,
            'shortedCountDelta': None,
            'mostShorted': None,
            'mostViewed': None,
            'mostFollowed': None,
            'updatedAt': None,
        })


@api_view(['GET'])
@perm([HasAPIKey])
def top_lists_view(request):
    cached = cache.get('top_lists')
    if cached:
        return Response(cached)

    try:
        # Top 10 most viewed detail pages in last 30 days
        one_month_ago = timezone.now() - timedelta(days=30)
        code_pattern = re.compile(r'/details/(\S+)')
        detail_logs = list(RequestLog.objects.filter(
            requested_url__icontains='/details/',
            timestamp__gte=one_month_ago,
        ).values_list('requested_url', flat=True))

        view_counts = {}
        for url in detail_logs:
            match = code_pattern.search(url)
            if match:
                code = match.group(1).strip('/')
                view_counts[code] = view_counts.get(code, 0) + 1

        sorted_views = sorted(view_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        most_viewed = []
        for code, _ in sorted_views:
            try:
                stock = Stock.objects.get(code=code)
                most_viewed.append({'symbol': stock.symbol, 'name': stock.name, 'code': stock.code})
            except Stock.DoesNotExist:
                pass

        # Top 10 most followed stocks
        most_followed = list(
            Stock.objects.annotate(follower_count=Count('app_users'))
            .filter(follower_count__gt=0)
            .order_by('-follower_count')[:10]
            .values('symbol', 'name', 'code')
        )

        # Top 10 most shorted stocks (highest current value)
        latest_positions = ShortPosition.objects.filter(
            stock__active=True
        ).values('stock').annotate(latest=Max('timestamp'))

        shorted_list = []
        for entry in latest_positions:
            pos = ShortPosition.objects.select_related('stock').filter(
                stock_id=entry['stock'], timestamp=entry['latest']
            ).first()
            if pos and pos.value > 0:
                shorted_list.append({
                    'symbol': pos.stock.symbol,
                    'name': pos.stock.name,
                    'code': pos.stock.code,
                    'value': pos.value,
                })

        most_shorted = sorted(shorted_list, key=lambda x: x['value'], reverse=True)[:10]

        # Top 10 most frequently updated stocks (most ShortPosition entries in last 30 days)
        most_updated = list(
            ShortPosition.objects.filter(timestamp__gte=one_month_ago)
            .values('stock__symbol', 'stock__name', 'stock__code')
            .annotate(update_count=Count('id'))
            .order_by('-update_count')[:10]
        )
        most_active = [
            {'symbol': e['stock__symbol'], 'name': e['stock__name'], 'code': e['stock__code'],
             'updates': e['update_count']}
            for e in most_updated
        ]

        data = {
            'mostViewed': most_viewed,
            'mostFollowed': most_followed,
            'mostShorted': most_shorted,
            'mostActive': most_active,
        }
        cache.set('top_lists', data, timeout=CACHE_TIMEOUT_SECONDS)
        return Response(data)
    except Exception:
        return Response({
            'mostViewed': [],
            'mostFollowed': [],
            'mostShorted': [],
            'mostActive': [],
        })
