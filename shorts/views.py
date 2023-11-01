import time

from django.db.models import Max
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework_api_key.permissions import HasAPIKey

from shorts.cache import Cache
from shorts.models import ShortedStock, SymbolMap
from shorts.serializers import ShortedStockSerializer


class ShortedStockView(ReadOnlyModelViewSet):
    permission_classes = [HasAPIKey]
    serializer_class = ShortedStockSerializer
    queryset = ShortedStock.objects.all()
    lookup_field = 'code'
    cache = Cache()

    def list(self, request, *args, **kwargs):

        combined_data = self.cache.get("all")
        if not combined_data:
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
            self.cache.add("all", combined_data)

        serializer = self.serializer_class(combined_data, many=True)
        return Response(serializer.data)

    def retrieve(self, request, code=None, *args, **kwargs):

        combined_data = self.cache.get(code)
        if not combined_data:
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
            self.cache.add(code, combined_data)

        serializer = self.serializer_class(combined_data, many=True)
        return Response(serializer.data)
