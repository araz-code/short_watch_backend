import math
from collections import namedtuple
from datetime import timedelta, datetime, date

from django.core.cache import cache
from functools import reduce
from operator import or_

from django.db.models import Max, Prefetch, Count, Subquery, OuterRef, F, ExpressionWrapper, FloatField, Avg, Q, \
    Func, Value, CharField
from django.utils import timezone
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, GenericViewSet
from rest_framework_api_key.permissions import HasAPIKey

from request_logging.models import RequestLog
from shorts.models import ShortPosition, Stock, LargeShortSelling, ShortPositionChart, ShortSeller, Announcement
from shorts.serializers import ShortPositionSerializer, ShortSellerSerializerOld, ShortPositionDetailSerializer, \
    ShortSellerListSerializer, ShortSellerDetailSerializer

# Max age for cached responses. fetch_shorts invalidates these keys after
# each run; this timeout is the upper bound that keeps stale entries from
# sticking around forever.
CACHE_TIMEOUT_SECONDS = 20 * 60


class ShortPositionView(ReadOnlyModelViewSet):
    permission_classes = [HasAPIKey]
    serializer_class = ShortPositionSerializer
    queryset = ShortPosition.objects.all()
    lookup_field = 'code'

    def list(self, request, *args, **kwargs):
        cached = cache.get('short_positions_list')
        if cached:
            return Response(cached)
        # Cache miss (e.g. first request before fetch_shorts has warmed it).
        return Response(warm_short_positions_list_cache())

    def retrieve(self, request, code=None, *args, **kwargs):
        short_positions_for_code = self.get_queryset().select_related('stock') \
            .filter(stock__code=code).order_by('-timestamp')

        serializer = self.serializer_class(short_positions_for_code, many=True)
        return Response(serializer.data)


def _build_short_positions_list():
    """Latest short position per active stock, sorted by symbol and de-duplicated.
    Request-independent so it can be warmed off the request path."""
    latest_per_stock = dict(
        ShortPosition.objects
        .filter(stock__active=True)
        .values('stock_id')
        .annotate(max_ts=Max('timestamp'))
        .values_list('stock_id', 'max_ts')
    )
    most_recent_short_positions = (
        ShortPosition.objects.select_related('stock')
        .filter(reduce(or_, (Q(stock_id=sid, timestamp=ts)
                             for sid, ts in latest_per_stock.items())))
    ) if latest_per_stock else ShortPosition.objects.none()

    sorted_data = sorted(most_recent_short_positions, key=lambda x: x.stock.symbol)
    seen = set()
    sorted_data = [p for p in sorted_data if p.stock_id not in seen and not seen.add(p.stock_id)]

    return ShortPositionSerializer(sorted_data, many=True).data


def warm_short_positions_list_cache():
    """Build the short positions list and store it in the cache. Called by
    fetch_shorts so the list is served from cache, never rebuilt on a request."""
    data = _build_short_positions_list()
    cache.set('short_positions_list', data, timeout=CACHE_TIMEOUT_SECONDS)
    return data


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
                                                                         'daysToCover',
                                                                         'showPriceData'])


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


def _compute_days_to_cover(historic, chart_values, shares_outstanding):
    """Days it would take all shorts to cover at the 30-day average daily volume.

    days_to_cover = shares_shorted / avg_daily_volume
    """
    if not historic or not chart_values or not shares_outstanding:
        return None
    shares_shorted = historic[0].value / 100 * shares_outstanding
    recent = sorted(chart_values, key=lambda c: c.date, reverse=True)[:30]
    volumes = [c.volume for c in recent if c.volume and c.volume > 0]
    if not volumes:
        return None
    avg_volume = sum(volumes) / len(volumes)
    return round(shares_shorted / avg_volume, 1)


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

STOCK_DETAIL_CHART_START_OVERRIDES = {
    'DK0010311471': date(2025, 12, 3),  # Sydbank merged
    'DK0064867972': date(2026, 5, 28),  # BioMar newly listed, no price data before this
}


def _stock_detail_queryset():
    """Fresh queryset (called, never a shared class attribute) with the
    prefetches the detail build needs."""
    return Stock.objects.prefetch_related(
        'shortposition_set',
        'shortpositionchart_set',
        Prefetch('largeshortselling_set',
                 queryset=LargeShortSelling.objects.select_related('stock', 'short_seller')),
        Prefetch('announcement_set',
                 queryset=Announcement.objects.select_related('stock')),
    )


def _build_short_position_detail(stock):
    """Build the serialized detail payload for one stock. Request-independent:
    ShortPositionDetailSerializer is a plain Serializer with field-based nested
    serializers (no request/context), so this matches what retrieve() returns
    on a real request and can be warmed off the request path."""
    overrides = STOCK_DETAIL_CHART_START_OVERRIDES

    historic_qs = stock.shortposition_set.all().order_by('-timestamp')
    if stock.code in overrides:
        historic_qs = historic_qs.filter(timestamp__date__gte=overrides[stock.code])
    historic = historic_qs[:100]

    chart_qs = stock.shortpositionchart_set.all()
    if stock.code in overrides:
        chart_qs = chart_qs.filter(date__gte=overrides[stock.code])
    chart_values = list(chart_qs.order_by('-date'))

    one_month_ago = datetime.now() - timedelta(days=30)
    announcements = stock.announcement_set.filter(published_date__gte=one_month_ago).order_by(
        '-published_date')

    effective_start = overrides.get(stock.code, FIRST_ENTRY_DATE)
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
    days_to_cover = _compute_days_to_cover(historic, chart_values, stock.shares_outstanding)

    response = ShortedStockDetailsResponse(chart_values, historic, sellers, announcements,
                                           percentile, velocity_7d, velocity_30d, price_flow,
                                           stock.shares_outstanding, days_to_cover,
                                           stock.show_price_data)

    return ShortPositionDetailSerializer(response).data


def warm_short_position_details_cache():
    """Pre-warm the per-stock detail cache under 'detail_{code}' for every
    active stock. Called by fetch_shorts so detail is served from cache, never
    rebuilt on a request. Only active stocks are warmed (the watch list filters
    to active, so only those details are ever requested); inactive stocks stay
    invalidated and rebuild lazily on the rare request."""
    entries = {
        f'detail_{stock.code}': _build_short_position_detail(stock)
        for stock in _stock_detail_queryset().filter(active=True)
    }
    if entries:
        cache.set_many(entries, timeout=CACHE_TIMEOUT_SECONDS)
    return entries


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
            stock = _stock_detail_queryset().get(code=code)
            data = _build_short_position_detail(stock)
            cache.set(cache_key, data, timeout=CACHE_TIMEOUT_SECONDS)
            return Response(data)
        except Stock.DoesNotExist:
            return Response(ShortPositionDetailSerializer(
                ShortedStockDetailsResponse([], [], [], [], None, None, None, [], None, None, True)).data)


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
        cached = cache.get('short_sellers_list')
        if cached:
            return Response(cached)
        # Cache miss (e.g. first request before fetch_shorts has warmed it).
        return Response(warm_short_sellers_list_cache())

    def retrieve(self, request, *args, **kwargs):
        seller = self.get_object()
        cache_key = f'seller_detail_{seller.pk}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        # Cache miss (e.g. first request before fetch_shorts has warmed it).
        data = self.get_serializer(seller).data
        cache.set(cache_key, data, timeout=CACHE_TIMEOUT_SECONDS)
        return Response(data)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            if hasattr(self, 'detail_serializer_class'):
                return self.detail_serializer_class

        return self.serializer_class


def _build_short_sellers_list():
    """Serialize the short sellers list. Request-independent: no pagination or
    filter backends are configured, and ShortSellerListSerializer uses only
    object-based method fields (no request/context), so this matches what the
    view returns on a real request.

    .all() forces a fresh evaluation: ShortSellerView.queryset is a shared
    class-level QuerySet that caches its rows once iterated, so without this
    a later run in the same process would serialize stale data."""
    return ShortSellerListSerializer(ShortSellerView.queryset.all(), many=True).data


def warm_short_sellers_list_cache():
    """Build the short sellers list and store it in the cache. Called by
    fetch_shorts so the list is served from cache, never rebuilt on a request."""
    data = _build_short_sellers_list()
    cache.set('short_sellers_list', data, timeout=CACHE_TIMEOUT_SECONDS)
    return data


def warm_short_seller_details_cache():
    """Build every short seller's detail payload and store each under its own
    'seller_detail_{pk}' key. Called by fetch_shorts so seller detail is served
    from cache, never rebuilt on a request.

    Request-independent: ShortSellerDetailSerializer uses only object-based
    method fields (no request/context), so this matches what retrieve()
    returns on a real request. Iterates the same filtered queryset the view
    exposes, so only retrievable sellers are warmed.

    .all() forces a fresh evaluation: ShortSellerView.queryset is a shared
    class-level QuerySet that caches its rows once iterated, so without this
    a later run in the same process would serialize stale data."""
    entries = {
        f'seller_detail_{seller.pk}': ShortSellerDetailSerializer(seller).data
        for seller in ShortSellerView.queryset.all()
    }
    if entries:
        cache.set_many(entries, timeout=CACHE_TIMEOUT_SECONDS)
    return entries


import re
from rest_framework.decorators import api_view, permission_classes as perm


@api_view(['GET'])
@perm([HasAPIKey])
def stats_view(request):
    cached = cache.get('homepage_stats')
    if cached:
        return Response(cached)
    # Cache miss (e.g. the first request before fetch_shorts has warmed it).
    return Response(warm_homepage_stats_cache())


# Returned (but not cached) if the stats build hits an unexpected error, so a
# transient failure never gets stuck in the cache for the full timeout.
_FALLBACK_HOMEPAGE_STATS = {
    'shortedCount': 0,
    'shortedCountDelta': None,
    'mostShorted': None,
    'mostViewed': None,
    'mostFollowed': None,
    'updatedAt': None,
}


def _build_homepage_stats():
    """Build the homepage summary numbers. Returns the data dict, or None on
    failure so the caller can avoid caching an error result."""
    try:
        # 1. Currently shorted active stocks (latest value > 0), the single most
        #    shorted, and the latest update timestamp. Subquery annotations avoid
        #    the previous one-query-per-stock loop.
        latest_value_subq = ShortPosition.objects.filter(
            stock=OuterRef('pk')
        ).order_by('-timestamp').values('value')[:1]
        latest_ts_subq = ShortPosition.objects.filter(
            stock=OuterRef('pk')
        ).order_by('-timestamp').values('timestamp')[:1]
        shorted_stocks = list(
            Stock.objects.filter(active=True)
            .annotate(
                latest_value=Subquery(latest_value_subq, output_field=FloatField()),
                latest_ts=Subquery(latest_ts_subq),
            )
            .filter(latest_value__gt=0)
        )
        shorted_count = len(shorted_stocks)
        most_shorted = None
        most_shorted_value = 0
        latest_update = None
        for s in shorted_stocks:
            if s.latest_value > most_shorted_value:
                most_shorted_value = s.latest_value
                most_shorted = s
            if s.latest_ts and (latest_update is None or s.latest_ts > latest_update):
                latest_update = s.latest_ts

        # 1b. Same count as of 7 days ago, for the freshness delta. One grouped
        #     query instead of a per-stock loop.
        seven_days_ago = timezone.now() - timedelta(days=7)
        prev_value_subq = ShortPosition.objects.filter(
            stock=OuterRef('pk'), timestamp__lt=seven_days_ago
        ).order_by('-timestamp').values('value')[:1]
        prev_shorted_count = (
            Stock.objects.filter(active=True)
            .annotate(prev_value=Subquery(prev_value_subq, output_field=FloatField()))
            .filter(prev_value__gt=0)
            .count()
        )

        most_shorted_prev_value = None
        if most_shorted:
            prev_pos = ShortPosition.objects.filter(
                stock=most_shorted,
                timestamp__lt=seven_days_ago,
            ).order_by('-timestamp').first()
            if prev_pos:
                most_shorted_prev_value = prev_pos.value

        # 2. Most viewed detail page in the last month (by unique IPs), in SQL.
        one_month_ago = timezone.now() - timedelta(days=30)
        mv_rows = _most_viewed_counts(one_month_ago, limit=1)
        most_viewed_stock = None
        most_viewed_count = 0
        if mv_rows:
            top = mv_rows[0]
            most_viewed_stock = Stock.objects.filter(code=top['code']).first()
            if most_viewed_stock:
                most_viewed_count = top['viewers']

        # 3. Most followed stock (by app users)
        most_followed = Stock.objects.annotate(
            follower_count=Count('app_users')
        ).order_by('-follower_count').first()

        return {
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
    except Exception:
        return None


def warm_homepage_stats_cache():
    """Build the homepage stats and store them in the cache. Called by
    fetch_shorts after each run so the work stays off the user request path."""
    data = _build_homepage_stats()
    if data is None:
        return _FALLBACK_HOMEPAGE_STATS
    cache.set('homepage_stats', data, timeout=CACHE_TIMEOUT_SECONDS)
    return data


def _most_viewed_counts(one_month_ago, limit=20):
    """Distinct client IPs per stock code for /details/ requests, computed in SQL
    so we never pull the raw log rows into Python and regex-parse each one.
    Returns a list of {'code', 'viewers'} ordered by viewers desc."""
    after_details = Func(F('requested_url'), Value('/details/'), Value(-1),
                         function='SUBSTRING_INDEX')
    code_segment = Func(after_details, Value('/'), Value(1), function='SUBSTRING_INDEX')
    code_expr = Func(code_segment, Value('?'), Value(1), function='SUBSTRING_INDEX',
                     output_field=CharField())
    return list(
        RequestLog.objects.filter(
            requested_url__icontains='/details/',
            timestamp__gte=one_month_ago,
        )
        .annotate(code=code_expr)
        .values('code')
        .annotate(viewers=Count('client_ip', distinct=True))
        .order_by('-viewers')[:limit]
    )


def _compute_most_viewed(one_month_ago):
    rows = _most_viewed_counts(one_month_ago, limit=20)
    # Map codes to stocks in a single query, preserving the viewer ranking and
    # skipping any code that no longer matches a known stock.
    stocks = {s.code: s for s in Stock.objects.filter(code__in=[r['code'] for r in rows])}
    result = []
    for row in rows:
        stock = stocks.get(row['code'])
        if stock:
            result.append({'symbol': stock.symbol, 'name': stock.name, 'code': stock.code})
        if len(result) >= 10:
            break
    return result


def _compute_most_followed():
    return list(
        Stock.objects.annotate(follower_count=Count('app_users'))
        .filter(follower_count__gt=0)
        .order_by('-follower_count')[:10]
        .values('symbol', 'name', 'code')
    )


def _compute_most_shorted():
    # Annotate each active stock with its latest short value via a subquery and
    # sort in the database, instead of issuing one query per stock in a loop.
    latest_value_subq = ShortPosition.objects.filter(
        stock=OuterRef('pk')
    ).order_by('-timestamp').values('value')[:1]
    rows = (
        Stock.objects.filter(active=True)
        .annotate(latest_value=Subquery(latest_value_subq, output_field=FloatField()))
        .filter(latest_value__gt=0)
        .order_by('-latest_value')[:10]
        .values('symbol', 'name', 'code', 'latest_value')
    )
    return [
        {'symbol': r['symbol'], 'name': r['name'], 'code': r['code'], 'value': r['latest_value']}
        for r in rows
    ]


def _compute_most_active(one_month_ago):
    most_updated = list(
        ShortPosition.objects.filter(timestamp__gte=one_month_ago)
        .values('stock__symbol', 'stock__name', 'stock__code')
        .annotate(update_count=Count('id'))
        .order_by('-update_count')[:10]
    )
    return [
        {'symbol': e['stock__symbol'], 'name': e['stock__name'], 'code': e['stock__code'],
         'updates': e['update_count']}
        for e in most_updated
    ]


def _compute_risers_fallers():
    one_month_ago_date = timezone.now().date() - timedelta(days=30)
    latest_value_subq = ShortPositionChart.objects.filter(
        stock=OuterRef('pk'),
    ).order_by('-date').values('value')[:1]
    oldest_value_subq = ShortPositionChart.objects.filter(
        stock=OuterRef('pk'),
        date__gte=one_month_ago_date,
    ).order_by('date').values('value')[:1]
    stocks_with_delta = (
        Stock.objects.filter(active=True)
        .annotate(
            latest_value=Subquery(latest_value_subq),
            oldest_value=Subquery(oldest_value_subq),
        )
        .filter(latest_value__isnull=False, oldest_value__isnull=False)
        .annotate(
            delta=ExpressionWrapper(
                F('latest_value') - F('oldest_value'),
                output_field=FloatField(),
            )
        )
    )
    most_rising = [
        {'symbol': s.symbol, 'name': s.name, 'code': s.code,
         'delta': round(s.delta, 2), 'value': round(s.latest_value, 2)}
        for s in stocks_with_delta.order_by('-delta')[:10]
        if s.delta > 0
    ]
    most_falling = [
        {'symbol': s.symbol, 'name': s.name, 'code': s.code,
         'delta': round(s.delta, 2), 'value': round(s.latest_value, 2)}
        for s in stocks_with_delta.order_by('delta')[:10]
        if s.delta < 0
    ]
    return most_rising, most_falling


def _compute_top_days_to_cover():
    volume_cutoff = timezone.now().date() - timedelta(days=30)
    latest_pos_subq = ShortPosition.objects.filter(
        stock=OuterRef('pk')
    ).order_by('-timestamp').values('value')[:1]
    active_stocks = (
        Stock.objects.filter(active=True, shares_outstanding__isnull=False)
        .annotate(latest_short=Subquery(latest_pos_subq, output_field=FloatField()))
        .filter(latest_short__gt=0)
    )
    # Average volume per stock over the window in one grouped query, rather than
    # a separate query inside the loop for every active stock.
    avg_volumes = {
        row['stock']: row['avg_volume']
        for row in ShortPositionChart.objects.filter(
            date__gte=volume_cutoff, volume__isnull=False
        ).values('stock').annotate(avg_volume=Avg('volume'))
    }
    days_to_cover_list = []
    for s in active_stocks:
        avg_volume = avg_volumes.get(s.pk)
        if not avg_volume or avg_volume <= 0:
            continue
        dtc = (s.latest_short / 100.0 * s.shares_outstanding) / avg_volume
        days_to_cover_list.append({
            'symbol': s.symbol, 'name': s.name, 'code': s.code,
            'days': round(dtc, 1),
        })
    return sorted(days_to_cover_list, key=lambda x: x['days'], reverse=True)[:10]


def _compute_most_short_sellers():
    lss_model_name = LargeShortSelling._meta.model_name
    lss_not_deleted = Q(**{f'{lss_model_name}__delete': False})
    rows = list(
        Stock.objects.filter(active=True)
        .annotate(seller_count=Count(f'{lss_model_name}__short_seller', distinct=True, filter=lss_not_deleted))
        .filter(seller_count__gt=0)
        .order_by('-seller_count')[:10]
        .values('symbol', 'name', 'code', 'seller_count')
    )
    return [
        {'symbol': e['symbol'], 'name': e['name'], 'code': e['code'], 'sellers': e['seller_count']}
        for e in rows
    ]


@api_view(['GET'])
@perm([HasAPIKey])
def top_lists_view(request):
    cached = cache.get('top_lists')
    if cached:
        return Response(cached)
    # Cache miss (e.g. the very first request, before fetch_shorts has warmed it).
    # Build, cache and return so subsequent requests are served from cache.
    return Response(warm_top_lists_cache())


def _build_top_lists():
    one_month_ago = timezone.now() - timedelta(days=30)

    def safe(fn, *args):
        try:
            return fn(*args)
        except Exception:
            return []

    most_rising, most_falling = safe(_compute_risers_fallers) or ([], [])

    return {
        'mostViewed': safe(_compute_most_viewed, one_month_ago),
        'mostFollowed': safe(_compute_most_followed),
        'mostShorted': safe(_compute_most_shorted),
        'mostActive': safe(_compute_most_active, one_month_ago),
        'mostRising': most_rising,
        'mostFalling': most_falling,
        'mostDaysToCover': safe(_compute_top_days_to_cover),
        'mostShortSellers': safe(_compute_most_short_sellers),
    }


def warm_top_lists_cache():
    """Build the top lists and store them in the cache. Called by fetch_shorts
    after each run so the heavy aggregation runs off the user request path."""
    data = _build_top_lists()
    cache.set('top_lists', data, timeout=CACHE_TIMEOUT_SECONDS)
    return data


@api_view(['GET'])
@perm([HasAPIKey])
def recent_feed_view(request):
    from insider_transactions.models import InsiderTransaction
    from insider_transactions.utils import categorize_transaction_type

    code = request.query_params.get('code')
    codes_param = request.query_params.get('codes')
    is_global = not code and not codes_param
    types_param = request.query_params.get('types', 'all')
    include_sellers = types_param != 'insider'

    try:
        days = int(request.query_params.get('days', 60))
    except ValueError:
        days = 60
    cutoff = (datetime.now() - timedelta(days=days)).date()

    ann_items = []
    if include_sellers:
        lss_qs = LargeShortSelling.objects.select_related('stock', 'short_seller').filter(
            delete=False,
            stock__active=True,
            date__gte=cutoff,
        )
        if code:
            lss_qs = lss_qs.filter(stock__code=code)
        elif codes_param:
            codes_list = [c.strip() for c in codes_param.split(',') if c.strip()]
            lss_qs = lss_qs.filter(stock__code__in=codes_list)
        for lss in lss_qs.order_by('-date')[:30]:
            ann_items.append({
                'type': 'large_seller',
                'date': lss.date.isoformat(),
                'stockSymbol': lss.stock.symbol,
                'stockCode': lss.stock.code,
                'stockName': lss.stock.name,
                'value': lss.value,
                'prevValue': lss.prev_value,
                'sellerName': lss.name,
                'sellerId': str(lss.short_seller_id),
            })

    ins_qs = InsiderTransaction.objects.select_related('issuer').filter(
        published_date__gte=cutoff,
        issuer__active=True,
    )
    if code:
        try:
            stock = Stock.objects.get(code=code)
            ins_qs = ins_qs.filter(issuer__symbol=stock.symbol)
        except Stock.DoesNotExist:
            ins_qs = InsiderTransaction.objects.none()
    elif codes_param:
        codes_list = [c.strip() for c in codes_param.split(',') if c.strip()]
        symbols = list(Stock.objects.filter(code__in=codes_list, active=True).values_list('symbol', flat=True))
        ins_qs = ins_qs.filter(issuer__symbol__in=symbols)
    ins_qs = ins_qs.order_by('-published_date', '-created_at')[:100]

    ins_items = []
    for tx in ins_qs:
        ins_items.append({
            'type': 'insider',
            'date': tx.published_date.isoformat(),
            'stockSymbol': tx.issuer.symbol,
            'issuerName': tx.issuer.name,
            'issuerCvr': tx.issuer.cvr,
            'personName': tx.person_name,
            'transactionCategory': categorize_transaction_type(tx.transaction_type),
            'totalAmount': float(tx.total_amount) if tx.total_amount else None,
            'currency': tx.currency,
        })

    all_items = ann_items + ins_items
    all_items.sort(key=lambda x: x['date'], reverse=True)

    return Response(all_items)
