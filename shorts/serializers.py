from django.db.models import Q
from rest_framework import serializers

from shorts.models import ShortPosition, LargeShortSelling, ShortPositionChart, Announcement, ShortSeller


class ShortPositionSerializer(serializers.ModelSerializer):
    code = type('SerializerMethodField', (serializers.SerializerMethodField,
                                          serializers.CharField), dict())()
    name = type('SerializerMethodField', (serializers.SerializerMethodField,
                                          serializers.CharField), dict())()
    symbol = type('SerializerMethodField', (serializers.SerializerMethodField,
                                            serializers.CharField), dict())()
    timestamp = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S%z')
    prevValue = serializers.FloatField(source='prev_value')

    class Meta:
        model = ShortPosition
        fields = ('code', 'name', 'symbol', 'value', 'prevValue', 'timestamp')

    @staticmethod
    def get_code(instance) -> str:
        return instance.stock.code

    @staticmethod
    def get_name(instance) -> str:
        return instance.stock.name

    @staticmethod
    def get_symbol(instance) -> str:
        return instance.stock.symbol


class ShortSellerSerializerOld(serializers.ModelSerializer):
    class Meta:
        model = LargeShortSelling
        fields = ('name', 'date', 'value')


class DateWithAddedTimeField(serializers.Field):
    def to_representation(self, value):
        return value.strftime('%Y-%m-%dT00:00:00+0000') if value else None


class LargeShortSellingSerializer(serializers.ModelSerializer):
    stockSymbol = serializers.CharField(source='stock.symbol')
    stockCode = serializers.CharField(source='stock.code')
    shortSeller = serializers.UUIDField(source='short_seller.id')
    prevValue = serializers.FloatField(source='prev_value')

    date = DateWithAddedTimeField()

    class Meta:
        model = LargeShortSelling
        fields = ('id', 'name', 'date', 'value', 'prevValue', 'stockSymbol', 'stockCode', 'shortSeller')


class ShortPositionChartSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S%z')

    class Meta:
        model = ShortPositionChart
        fields = ('timestamp', 'value', 'close')


class AnnouncementSerializer(serializers.ModelSerializer):
    publishedDate = serializers.DateTimeField(source='published_date', format='%Y-%m-%dT%H:%M:%S%z')
    headlineDanish = serializers.DateTimeField(source='headline_danish')
    isHistoric = serializers.BooleanField(source='is_historic')
    dfsaId = serializers.DateTimeField(source='dfsa_id')
    stockSymbol = serializers.CharField(source='stock.symbol')
    stockCode = serializers.CharField(source='stock.code')

    class Meta:
        model = Announcement
        fields = ('publishedDate', 'headline', 'headlineDanish', 'type', 'dfsaId', 'value',
                  'isHistoric', 'stockSymbol', 'stockCode')


class ShortPositionDetailSerializer(serializers.Serializer):
    chartValues = ShortPositionChartSerializer(many=True)
    historic = ShortPositionSerializer(many=True)
    sellers = LargeShortSellingSerializer(many=True)
    announcements = AnnouncementSerializer(many=True)


class LargeShortSellingForShortSellerSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol')

    class Meta:
        model = LargeShortSelling
        fields = ('stock_symbol',)


class AnnouncementForShortSellerSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol')

    class Meta:
        model = Announcement
        fields = ('stock_symbol',)

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        if "CANCELLATION" in representation['headline'] or "CANCELLED" in representation['headline']:
            return None

        return representation


class ShortSellerListSerializer(serializers.ModelSerializer):
    current = serializers.SerializerMethodField()
    previous = serializers.SerializerMethodField()

    class Meta:
        model = ShortSeller
        fields = ('id', 'name', 'current', 'previous')

    @staticmethod
    def get_current(obj):
        return [x.stock.symbol for x in obj.large_short_sellings.all()]

    def get_previous(self, obj):
        current = set(self.get_current(obj))
        previous = set([x.stock.symbol for x in obj.announcements.all() if x.stock.symbol not in current])
        return list(previous)


class ShortSellerDetailSerializer(serializers.ModelSerializer):
    announcements = serializers.SerializerMethodField()

    class Meta:
        model = ShortSeller
        fields = ('id', 'name', 'announcements')

    @staticmethod
    def get_announcements(obj):
        sorted_announcements = obj.announcements.exclude(
            Q(headline__icontains="CANCELLATION") | Q(headline__icontains="CANCELLED")
        ).order_by('-published_date')
        return AnnouncementSerializer(sorted_announcements, many=True).data


