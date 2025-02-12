from rest_framework import serializers
from .models import Measurement


class MeasurementSerializer(serializers.ModelSerializer):
    userID = serializers.DateTimeField(source='user_id')

    class Meta:
        model = Measurement
        fields = ['userID', 'temperature', 'humidity', 'created_at']
