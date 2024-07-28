from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_api_key.permissions import HasAPIKey

from shorts.models import Stock
from .models import AppUser
from .serializers import AppUserSerializer, AddRemoveStockSerializer, UpdateNotificationStatusSerializer


@api_view(['POST'])
@permission_classes([HasAPIKey])
def create_app_user(request):
    serializer = AppUserSerializer(data=request.data)

    if serializer.is_valid():
        user_id = serializer.validated_data.get('user_id')
        fcm_token = serializer.validated_data.get('fcm_token')
        device = serializer.validated_data.get('device')
        version = serializer.validated_data.get('version')
        stock_codes = serializer.validated_data.get('stock_codes', [])

        app_user, _ = AppUser.objects.update_or_create(
            user_id=user_id,
            defaults={'fcm_token': fcm_token, 'device': device, 'version': version, 'invalid': None}
        )

        existing_stocks = Stock.objects.filter(code__in=stock_codes)
        app_user.stocks.set(existing_stocks)

        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([HasAPIKey])
def add_stock(request):
    serializer = AddRemoveStockSerializer(data=request.data)

    if serializer.is_valid():
        user_id = serializer.validated_data.get('user_id')
        stock_code = serializer.validated_data.get('stock_code')
        try:
            app_user = AppUser.objects.get(user_id=user_id)

            stock = Stock.objects.get(code=stock_code)
            app_user.stocks.add(stock)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except AppUser.DoesNotExist:
            return Response({'error': 'Unknown user id or stock code.'}, status=status.HTTP_404_NOT_FOUND)
        except Stock.DoesNotExist:
            return Response({'error': 'Unknown user id or stock code.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([HasAPIKey])
def remove_stock(request):
    serializer = AddRemoveStockSerializer(data=request.data)

    if serializer.is_valid():
        user_id = serializer.validated_data.get('user_id')
        stock_code = serializer.validated_data.get('stock_code')
        try:
            app_user = AppUser.objects.get(user_id=user_id)

            stock = Stock.objects.get(code=stock_code)
            app_user.stocks.remove(stock)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except AppUser.DoesNotExist:
            return Response({'error': 'Unknown user id or stock code.'}, status=status.HTTP_404_NOT_FOUND)
        except Stock.DoesNotExist:
            return Response({'error': 'Unknown user id or stock code.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([HasAPIKey])
def update_notification_status(request):
    serializer = UpdateNotificationStatusSerializer(data=request.data)

    if serializer.is_valid():
        user_id = serializer.validated_data.get('user_id')
        notification_active = serializer.validated_data.get('notification_active')
        try:
            app_user = AppUser.objects.get(user_id=user_id)
            app_user.notification_active = notification_active
            app_user.save()

            return Response(status=status.HTTP_204_NO_CONTENT)
        except AppUser.DoesNotExist:
            return Response({'error': 'Unknown user id'}, status=status.HTTP_404_NOT_FOUND)
        except AppUser.DoesNotExist:
            return Response({'error': 'Unknown user id.'}, status=status.HTTP_404_NOT_FOUND)
