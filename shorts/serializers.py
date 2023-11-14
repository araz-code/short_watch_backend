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


class DateWithAddedTimeField(serializers.Field):
    def to_representation(self, value):
        return value.strftime('%Y-%m-%dT00:00:00+0000') if value else None


class ShortSellerSerializerV2(serializers.ModelSerializer):
    date = DateWithAddedTimeField()

    class Meta:
        model = ShortSeller
        fields = ('name', 'date', 'value')


class ShortedStockChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShortedStockChart
        fields = ('timestamp', 'value')


class ShortedStockDetailsSerializer(serializers.Serializer):
    chartValues = ShortedStockChartSerializer(many=True)
    historic = ShortedStockSerializer(many=True)
    sellers = ShortSellerSerializerV2(many=True)
