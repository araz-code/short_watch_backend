from rest_framework import serializers

from shorts.models import ShortPosition, ShortSeller, ShortPositionChart


class ShortPositionSerializer(serializers.ModelSerializer):
    symbol = serializers.CharField(max_length=20)
    timestamp = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S%z')

    class Meta:
        model = ShortPosition
        fields = ('code', 'name', 'symbol', 'value', 'timestamp')


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
