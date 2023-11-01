import time

from django.db.models import Max
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework_api_key.permissions import HasAPIKey

from shorts.models import ShortedStock, SymbolMap
from shorts.serializers import ShortedStockSerializer


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
            .filter(timestamp__in=subquery.values('max_timestamp')).order_by('code')

        combined_data = []
        for stock in shorted_stocks:
            combined_data.append({
                'code': stock.code,
                'name': stock.name,
                'symbol': name_to_symbol.get(stock.name, stock.name),
                'value': stock.value,
                'timestamp': stock.timestamp,
            })

        time.sleep(0.2)

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
