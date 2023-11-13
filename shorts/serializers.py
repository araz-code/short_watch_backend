from rest_framework import serializers

from shorts.models import ShortedStock, ShortSeller, ShortedStockChart


class ShortedStockSerializer(serializers.ModelSerializer):
    symbol = serializers.CharField(max_length=20)
    timestamp = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S%z')

    class Meta:
        model = ShortedStock
        fields = ('code', 'name', 'symbol', 'value', 'timestamp')


class ShortSellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShortSeller
        fields = ('name', 'date', 'value')


class ShortedStockChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShortedStockChart
        fields = ('value',)


class ShortHistoricSerializer(serializers.Serializer):
    chartValues = serializers.ListField(child=serializers.FloatField())
    historic = ShortedStockSerializer(many=True)
    sellers = ShortSellerSerializer(many=True)
