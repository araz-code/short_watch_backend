from rest_framework import serializers
from .models import Measurement


class CreateMeasurementSerializer(serializers.ModelSerializer):
    userID = serializers.UUIDField(source='user_id')
    noiseLevel = serializers.FloatField(source='noise_level')
    lightLevel = serializers.IntegerField(source='light_level')

    class Meta:
        model = Measurement
        fields = ['userID', 'temperature', 'humidity', 'created_at', 'noiseLevel', 'lightLevel']


class MeasurementSerializer(serializers.ModelSerializer):
    userID = serializers.UUIDField(source='user_id')
    createdAt = serializers.DateTimeField(source='created_at', format='%Y-%m-%dT%H:%M:%S%z')
    noiseLevel = serializers.FloatField(source='noise_level')
    lightLevel = serializers.IntegerField(source='light_level')

    class Meta:
        model = Measurement
        fields = ['userID', 'temperature', 'humidity', 'createdAt', 'noiseLevel', 'lightLevel']
