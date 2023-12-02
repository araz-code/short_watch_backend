from rest_framework import serializers

from shorts.models import ShortPosition, ShortSeller, ShortPositionChart


class ShortPositionSerializer(serializers.ModelSerializer):
    symbol = type('SerializerMethodField', (serializers.SerializerMethodField,
                                            serializers.CharField), dict())()
    timestamp = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S%z')

    class Meta:
        model = ShortPosition
        fields = ('code', 'name', 'symbol', 'value', 'timestamp')

    @staticmethod
    def get_symbol(instance) -> str:
        return instance.stock.symbol


class ShortSellerSerializerOld(serializers.ModelSerializer):
    class Meta:
        model = ShortSeller
        fields = ('name', 'date', 'value')


class DateWithAddedTimeField(serializers.Field):
    def to_representation(self, value):
        return value.strftime('%Y-%m-%dT00:00:00+0000') if value else None


class ShortSellerSerializer(serializers.ModelSerializer):
    date = DateWithAddedTimeField()

    class Meta:
        model = ShortSeller
        fields = ('name', 'date', 'value')


class ShortPositionChartSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S%z')

    class Meta:
        model = ShortPositionChart
        fields = ('timestamp', 'value')


class ShortPositionDetailSerializer(serializers.Serializer):
    chartValues = ShortPositionChartSerializer(many=True)
    historic = ShortPositionSerializer(many=True)
    sellers = ShortSellerSerializer(many=True)
