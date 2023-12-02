from collections import namedtuple

from django.db.models import Max
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, GenericViewSet
from rest_framework_api_key.permissions import HasAPIKey

from shorts.models import ShortPosition, Stock, ShortSeller, ShortPositionChart
from shorts.serializers import ShortPositionSerializer, ShortSellerSerializerOld, ShortPositionDetailSerializer


class ShortPositionView(ReadOnlyModelViewSet):
    permission_classes = [HasAPIKey]
    serializer_class = ShortPositionSerializer
    queryset = ShortPosition.objects.all()
    lookup_field = 'code'

    def list(self, request, *args, **kwargs):

        symbol_map = Stock.objects.all().values('name', 'symbol')

        name_to_symbol = {entry['name']: entry['symbol'] for entry in symbol_map}

        subquery = ShortPosition.objects.values('name').annotate(max_timestamp=Max('timestamp'))
        shorted_stocks = ShortPosition.objects \
            .filter(timestamp__in=subquery.values('max_timestamp'))

        combined_data = []
        for stock in shorted_stocks:
            combined_data.append({
                'code': stock.code,
                'name': stock.name,
                'symbol': name_to_symbol.get(stock.name, stock.name),
                'value': stock.value,
                'timestamp': stock.timestamp,
            })

        combined_data.sort(key=lambda x: x['symbol'])

        serializer = self.serializer_class(combined_data, many=True)
        return Response(serializer.data)

    def retrieve(self, request, code=None, *args, **kwargs):
        symbol_obj = Stock.objects.filter(code=code).first()

        shorted_stocks = self.get_queryset().filter(code=code).order_by('-timestamp')

        combined_data = []
        for stock in shorted_stocks:
            combined_data.append({
                'code': stock.code,
                'name': stock.name,
                'symbol': symbol_obj.symbol if symbol_obj else stock.name,
                'value': stock.value,
                'timestamp': stock.timestamp,
            })

        serializer = self.serializer_class(combined_data, many=True)
        return Response(serializer.data)


class ShortSellerView(GenericViewSet, RetrieveAPIView):
    queryset = ShortSeller.objects.all()
    serializer_class = ShortSellerSerializerOld
    permission_classes = [HasAPIKey]
    lookup_field = 'stock_code'

    def retrieve(self, request, stock_code=None, *args, **kwargs):
        sellers = self.get_queryset().filter(stock_code=stock_code).order_by('-date')

        serializer = self.serializer_class(sellers, many=True)
        return Response(serializer.data)


ShortedStockDetailsResponse = namedtuple('ShortedStockDetailsResponse', ['chartValues', 'historic', 'sellers'])


class ShortPositionDetailView(GenericViewSet, RetrieveAPIView):
    queryset = ShortPosition.objects.all()
    serializer_class = ShortPositionDetailSerializer
    permission_classes = [HasAPIKey]
    lookup_field = 'code'

    def retrieve(self, request, code=None, *args, **kwargs):
        symbol_obj = Stock.objects.filter(code=code).first()

        shorted_stocks = self.get_queryset().filter(code=code).order_by('-timestamp')

        historic = []
        for stock in shorted_stocks:
            historic.append({
                'code': stock.code,
                'name': stock.name,
                'symbol': symbol_obj.symbol if symbol_obj else stock.name,
                'value': stock.value,
                'timestamp': stock.timestamp,
            })

        chart_values = ShortPositionChart.objects.filter(code=code).order_by('-date')[:9]

        sellers = ShortSeller.objects.filter(stock_code=code).order_by('-date')

        response = ShortedStockDetailsResponse(chart_values, historic, sellers)

        return Response(self.get_serializer(response).data)
