from collections import namedtuple
from datetime import timedelta, datetime, date

from django.db.models import Max
from django.utils import timezone
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, GenericViewSet
from rest_framework_api_key.permissions import HasAPIKey

from shorts.models import ShortPosition, Stock, LargeShortSelling, ShortPositionChart, ShortSeller
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

        most_recent_short_positions = ShortPosition.objects.filter(
            stock__in=stocks_with_latest_timestamp,
            timestamp__in=stocks_with_latest_timestamp.values('latest_timestamp')
        )

        sorted_data = sorted(most_recent_short_positions, key=lambda x: x.stock.symbol)

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
            stock = Stock.objects.prefetch_related('shortposition_set', 'shortpositionchart_set',
                                                   'largeshortselling_set').get(code=code)

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
    queryset = ShortSeller.objects.prefetch_related('large_short_sellings', 'announcements').all().order_by('name')
    serializer_class = ShortSellerListSerializer
    detail_serializer_class = ShortSellerDetailSerializer

    def get_serializer_class(self):
        if self.action == 'retrieve':
            if hasattr(self, 'detail_serializer_class'):
                return self.detail_serializer_class

        return self.serializer_class


