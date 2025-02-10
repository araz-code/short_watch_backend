from django.db.transaction import atomic
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework_api_key.permissions import HasAPIKey

from .serializers import MeasurementSerializer


@api_view(['POST'])
@permission_classes([HasAPIKey])
@atomic
def create_measurement(request):
    if request.method == 'POST':
        serializer = MeasurementSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
