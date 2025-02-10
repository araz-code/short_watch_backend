from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import MeasurementSerializer


@api_view(['POST'])
def create_measurement(request):
    if request.method == 'POST':
        serializer = MeasurementSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
