from rest_framework import serializers

from users.models import AppUser


class AppUserSerializer(serializers.ModelSerializer):
    userId = serializers.UUIDField(source='user_id')
    fcmToken = serializers.CharField(source='fcm_token')
    device = serializers.CharField()
    version = serializers.CharField()
    stockCodes = serializers.ListField(source="stock_codes",
                                       child=serializers.CharField(max_length=20), write_only=True)

    class Meta:
        model = AppUser
        fields = ['userId', 'fcmToken', 'device', 'version', 'stockCodes']


class AddRemoveStockSerializer(serializers.Serializer):
    userId = serializers.UUIDField(source='user_id')
    stockCode = serializers.CharField(source="stock_code")


class UpdateNotificationStatusSerializer(serializers.Serializer):
    userId = serializers.UUIDField(source='user_id')
    notificationActive = serializers.BooleanField(source="notification_active")
