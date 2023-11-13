from django.db.models import Max
from django.db.models.functions import TruncDate
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, GenericViewSet
from rest_framework_api_key.permissions import HasAPIKey

from shorts.models import ShortedStock, SymbolMap, ShortSeller, ShortedStockChart
from shorts.serializers import ShortedStockSerializer, ShortSellerSerializer, ShortedStockChartSerializer


class ShortedStockView(ReadOnlyModelViewSet):
    permission_classes = [HasAPIKey]
    serializer_class = ShortedStockSerializer
    queryset = ShortedStock.objects.all()
    lookup_field = 'code'

    def list(self, request, *args, **kwargs):

        symbol_map = SymbolMap.objects.all().values('name', 'symbol')

        name_to_symbol = {entry['name']: entry['symbol'] for entry in symbol_map}

        subquery = ShortedStock.objects.values('name').annotate(max_timestamp=Max('timestamp'))
        shorted_stocks = ShortedStock.objects \
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
        symbol_obj = SymbolMap.objects.filter(code=code).first()

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
    serializer_class = ShortSellerSerializer
    permission_classes = [HasAPIKey]
    lookup_field = 'stock_code'

    def retrieve(self, request, stock_code=None, *args, **kwargs):
        sellers = self.get_queryset().filter(stock_code=stock_code).order_by('-date')

        serializer = self.serializer_class(sellers, many=True)
        return Response(serializer.data)


class ShortedStockChartView(GenericViewSet, RetrieveAPIView):
    queryset = ShortedStockChart.objects.all()
    serializer_class = ShortedStockChartSerializer
    # permission_classes = [HasAPIKey]
    lookup_field = 'code'

    def retrieve(self, request, code=None, *args, **kwargs):
        records = self.get_queryset().filter(code=code).order_by('date')[:7]

        values_list = list(records.values_list('value', flat=True))

        return Response(values_list)
