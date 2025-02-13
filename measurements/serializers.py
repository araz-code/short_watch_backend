from rest_framework import serializers
from .models import Measurement


class MeasurementSerializer(serializers.ModelSerializer):
    userID = serializers.UUIDField(source='user_id')
    createdAt = serializers.DateTimeField(source='created_at', format='%Y-%m-%dT%H:%M:%S%z')

    class Meta:
        model = Measurement
        fields = ['userID', 'temperature', 'humidity', 'createdAt']
