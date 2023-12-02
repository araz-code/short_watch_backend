from collections import namedtuple

from django.db.models import Max
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, GenericViewSet
from rest_framework_api_key.permissions import HasAPIKey

from shorts.models import ShortPosition, Stock, ShortSeller
from shorts.serializers import ShortPositionSerializer, ShortSellerSerializerOld, ShortPositionDetailSerializer


class ShortPositionView(ReadOnlyModelViewSet):
    permission_classes = [HasAPIKey]
    serializer_class = ShortPositionSerializer
    queryset = ShortPosition.objects.all()
    lookup_field = 'code'

    def list(self, request, *args, **kwargs):
        subquery = ShortPosition.objects.values('name').annotate(max_timestamp=Max('timestamp'))
        most_recent_short_positions = ShortPosition.objects.filter(timestamp__in=subquery.values('max_timestamp'))

        sorted_data = sorted(most_recent_short_positions, key=lambda x: x.stock.symbol)

        serializer = self.serializer_class(sorted_data, many=True)
        return Response(serializer.data)

    def retrieve(self, request, code=None, *args, **kwargs):
        short_positions_for_code = self.get_queryset().filter(stock__code=code).order_by('-timestamp')

        serializer = self.serializer_class(short_positions_for_code, many=True)
        return Response(serializer.data)


class ShortSellerView(GenericViewSet, RetrieveAPIView):
    queryset = ShortSeller.objects.all()
    serializer_class = ShortSellerSerializerOld
    permission_classes = [HasAPIKey]
    lookup_field = 'code'

    def retrieve(self, request, code=None, *args, **kwargs):
        sellers = self.get_queryset().filter(stock__code=code).order_by('-date')

        serializer = self.serializer_class(sellers, many=True)
        return Response(serializer.data)


ShortedStockDetailsResponse = namedtuple('ShortedStockDetailsResponse', ['chartValues', 'historic', 'sellers'])


class ShortPositionDetailView(GenericViewSet, RetrieveAPIView):
    queryset = ShortPosition.objects.all()
    serializer_class = ShortPositionDetailSerializer
    permission_classes = [HasAPIKey]
    lookup_field = 'code'

    def retrieve(self, request, code=None, *args, **kwargs):
        try:
            stock = Stock.objects.prefetch_related('shortposition_set', 'shortpositionchart_set',
                                                   'shortseller_set').get(code=code)

            historic = stock.shortposition_set.all().order_by('-timestamp')[:30]

            chart_values = stock.shortpositionchart_set.all().order_by('-date')[:9]

            sellers = stock.shortseller_set.all().order_by('-date')

            response = ShortedStockDetailsResponse(chart_values, historic, sellers)

            return Response(self.get_serializer(response).data)
        except Stock.DoesNotExist:
            return Response(self.get_serializer(ShortedStockDetailsResponse([], [], [])).data)
