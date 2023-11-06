from rest_framework import serializers

from shorts.models import ShortedStock, ShortSeller


class ShortedStockSerializer(serializers.ModelSerializer):
    symbol = serializers.CharField(max_length=20)

    class Meta:
        model = ShortedStock
        fields = ('code', 'name', 'symbol', 'value', 'timestamp')


class ShortSellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShortSeller
        fields = ('name', 'date', 'value')
