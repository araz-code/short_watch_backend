from collections import namedtuple
from datetime import timedelta, datetime, date

from django.db.models import Max, Prefetch, Count
from django.utils import timezone
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, GenericViewSet
from rest_framework_api_key.permissions import HasAPIKey

from request_logging.models import RequestLog
from shorts.models import ShortPosition, Stock, LargeShortSelling, ShortPositionChart, ShortSeller, Announcement
from users.models import AppUser
from shorts.serializers import ShortPositionSerializer, ShortSellerSerializerOld, ShortPositionDetailSerializer, \
    ShortSellerListSerializer, ShortSellerDetailSerializer


class ShortPositionView(ReadOnlyModelViewSet):
    permission_classes = [HasAPIKey]
    serializer_class = ShortPositionSerializer
    queryset = ShortPosition.objects.all()
    lookup_field = 'code'

    def list(self, request, *args, **kwargs):
        stocks_with_latest_timestamp = Stock.objects.filter(active=True)\
            .annotate(latest_timestamp=Max('shortposition__timestamp'))

        most_recent_short_positions = ShortPosition.objects.select_related('stock').filter(
            stock__in=stocks_with_latest_timestamp,
            timestamp__in=stocks_with_latest_timestamp.values('latest_timestamp')
        )

        sorted_data = sorted(most_recent_short_positions, key=lambda x: x.stock.symbol)
        seen = set()
        sorted_data = [p for p in sorted_data if p.stock_id not in seen and not seen.add(p.stock_id)]

        serializer = self.serializer_class(sorted_data, many=True)
        return Response(serializer.data)

    def retrieve(self, request, code=None, *args, **kwargs):
        short_positions_for_code = self.get_queryset().select_related('stock')\
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
                                                                         'announcements'])

FIRST_ENTRY_DATE = date(2023, 11, 6)


class ShortPositionDetailView(GenericViewSet, RetrieveAPIView):
    queryset = ShortPosition.objects.all()
    serializer_class = ShortPositionDetailSerializer
    permission_classes = [HasAPIKey]
    lookup_field = 'code'

    def retrieve(self, request, code=None, *args, **kwargs):
        try:
            stock = Stock.objects.prefetch_related(
                'shortposition_set',
                'shortpositionchart_set',
                Prefetch('largeshortselling_set',
                         queryset=LargeShortSelling.objects.select_related('stock', 'short_seller')),
                Prefetch('announcement_set',
                         queryset=Announcement.objects.select_related('stock')),
            ).get(code=code)

            historic = stock.shortposition_set.all().order_by('-timestamp')[:100]

            chart_values = list(stock.shortpositionchart_set.all().order_by('-date'))

            one_month_ago = datetime.now() - timedelta(days=30)
            announcements = stock.announcement_set.filter(published_date__gte=one_month_ago).order_by(
                '-published_date')

            days_difference = (date.today() - FIRST_ENTRY_DATE).days

            missing_count = days_difference + 1 - len(chart_values)

            if missing_count > 0:
                earliest_date = chart_values[-1].date

                for i in range(missing_count):
                    missing_date = earliest_date - timedelta(days=i + 1)
                    if missing_date < FIRST_ENTRY_DATE:
                        break
                    missing_datetime = datetime.combine(missing_date, datetime.min.time(), tzinfo=timezone.utc)
                    chart_values.append(
                        ShortPositionChart(stock=stock, value=0, date=missing_date, timestamp=missing_datetime))

                chart_values = sorted(chart_values, key=lambda x: x.date, reverse=True)

            sellers = stock.largeshortselling_set.all().order_by('-date')

            response = ShortedStockDetailsResponse(chart_values, historic, sellers, announcements)

            return Response(self.get_serializer(response).data)
        except Stock.DoesNotExist:
            return Response(self.get_serializer(ShortedStockDetailsResponse([], [], [])).data)


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
        for entry in latest_positions:
            pos = ShortPosition.objects.select_related('stock').filter(
                stock_id=entry['stock'], timestamp=entry['latest']
            ).first()
            if pos and pos.value > 0:
                shorted_count += 1
                if pos.value > most_shorted_value:
                    most_shorted_value = pos.value
                    most_shorted = pos.stock

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

        return Response({
            'shortedCount': shorted_count,
            'mostShorted': {
                'symbol': most_shorted.symbol,
                'name': most_shorted.name,
                'code': most_shorted.code,
                'value': most_shorted_value,
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
        })
    except Exception:
        return Response({
            'shortedCount': 0,
            'mostShorted': None,
            'mostViewed': None,
            'mostFollowed': None,
        })


@api_view(['GET'])
@perm([HasAPIKey])
def top_lists_view(request):
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

        return Response({
            'mostViewed': most_viewed,
            'mostFollowed': most_followed,
            'mostShorted': most_shorted,
            'mostActive': most_active,
        })
    except Exception:
        return Response({
            'mostViewed': [],
            'mostFollowed': [],
            'mostShorted': [],
            'mostActive': [],
        })
