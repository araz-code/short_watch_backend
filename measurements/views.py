from django.db.transaction import atomic
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_api_key.permissions import HasAPIKey

from .models import Measurement
from .serializers import MeasurementSerializer, CreateMeasurementSerializer


@api_view(['POST'])
@permission_classes([HasAPIKey])
@atomic
def create_measurement(request):
    if request.method == 'POST':
        serializer = CreateMeasurementSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AllMeasurementsAPI(APIView):
    @staticmethod
    def get(_):
        measurements = Measurement.objects.order_by("-created_at")
        serializer = MeasurementSerializer(measurements, many=True)
        return Response(serializer.data)


class LatestMeasurementAPI(APIView):
    @staticmethod
    def get(_):
        measurement = Measurement.objects.order_by("-created_at").first()
        if measurement:
            serializer = MeasurementSerializer(measurement)
            return Response(serializer.data)
        return Response({"error": "No measurements found"}, status=status.HTTP_404_NOT_FOUND)