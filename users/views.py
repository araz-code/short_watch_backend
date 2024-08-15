from django.db.transaction import atomic
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_api_key.permissions import HasAPIKey

from errors.models import Error
from shorts.models import Stock
from .models import AppUser, WebUser
from .serializers import AppUserSerializer, AddRemoveStockSerializer, UpdateNotificationStatusSerializer, \
    WebUserSerializer, AppUserConsentSerializer


@api_view(['POST'])
@permission_classes([HasAPIKey])
@atomic
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
            defaults={'fcm_token': fcm_token, 'device': device, 'version': version, 'invalid': None,
                      'client_ip': get_client_ip(request)}
        )

        existing_stocks = Stock.objects.filter(code__in=stock_codes)
        app_user.stocks.set(existing_stocks)

        return Response(status=status.HTTP_204_NO_CONTENT)

    Error.objects.create(message=f'Users-create_app_user: {str(serializer.errors)}'[:500])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([HasAPIKey])
@atomic
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
            Error.objects.create(message=f'Users-add_stock ({stock_code}): Unknown user id: {user_id}.'[:500])
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Stock.DoesNotExist:
            Error.objects.create(message=f'Users-add_stock: Unknown stock code: {stock_code}.'[:500])
            return Response(status=status.HTTP_204_NO_CONTENT)

    Error.objects.create(message=f'Users-add_stock: {str(serializer.errors)}'[:500])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([HasAPIKey])
@atomic
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
            Error.objects.create(message=f'Users-remove_stock ({stock_code}): Unknown user id: {user_id}.'[:500])
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Stock.DoesNotExist:
            Error.objects.create(message=f'Users-remove_stock: Unknown stock code: {stock_code}.'[:500])
            return Response(status=status.HTTP_204_NO_CONTENT)

    Error.objects.create(message=f'Users-remove_stock: {str(serializer.errors)}'[:500])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([HasAPIKey])
@atomic
def update_notification_status(request):
    serializer = UpdateNotificationStatusSerializer(data=request.data)

    if serializer.is_valid():
        user_id = serializer.validated_data.get('user_id')
        notification_active = serializer.validated_data.get('notification_active')
        try:
            app_user, _ = AppUser.objects.update_or_create(
                user_id=user_id,
                defaults={'client_ip': get_client_ip(request)}
            )

            if app_user.notification_active != notification_active:
                app_user.old_notification_active = app_user.notification_active
            app_user.notification_active = notification_active

            app_user.save()

            return Response(status=status.HTTP_204_NO_CONTENT)
        except AppUser.DoesNotExist:
            Error.objects.create(message=f'Users-update_notification_status: Unknown user id: {user_id} - '
                                         f'{notification_active}.'[:500])
            return Response(status=status.HTTP_204_NO_CONTENT)

    Error.objects.create(message=f'Users-update_notification_status: {str(serializer.errors)}'[:500])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@csrf_exempt
@permission_classes([HasAPIKey])
@atomic
def create_web_user(request):
    serializer = WebUserSerializer(data=request.data)

    if serializer.is_valid():
        user_id = serializer.validated_data.get('user_id')
        consent_accepted = serializer.validated_data.get('consent_accepted')

        web_user, _ = WebUser.objects.update_or_create(user_id=user_id, defaults={'client_ip': get_client_ip(request)})

        if web_user.consent_accepted != consent_accepted:
            web_user.old_consent_accepted = web_user.consent_accepted
        web_user.consent_accepted = consent_accepted

        web_user.save()

        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@csrf_exempt
@permission_classes([HasAPIKey])
@atomic
def update_app_consent(request):
    serializer = AppUserConsentSerializer(data=request.data)

    if serializer.is_valid():
        user_id = serializer.validated_data.get('user_id')
        consent_accepted = serializer.validated_data.get('consent_accepted')

        app_user, created = AppUser.objects.update_or_create(user_id=user_id,
                                                             defaults={'consent_date': timezone.now(),
                                                                       'client_ip': get_client_ip(request)})

        if app_user.consent_accepted != consent_accepted:
            app_user.old_consent_accepted = app_user.consent_accepted
        app_user.consent_accepted = consent_accepted

        app_user.save()

        if created:
            Error.objects.create(message=f'Users-update_app_consent: Unknown user id updated consent: {user_id} - '
                                         f'{consent_accepted}.'[:500])

        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(status=status.HTTP_204_NO_CONTENT)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')

    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    elif request.META.get('HTTP_X_REAL_IP'):
        ip = request.META.get('HTTP_X_REAL_IP')
    else:
        ip = request.META.get('REMOTE_ADDR')

    return ip
