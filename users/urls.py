from django.urls import path

from users import views

urlpatterns = [
    path('register-token', views.create_app_user),
    path('add-stock', views.add_stock),
    path('remove-stock', views.remove_stock),
    path('update-notification-status', views.update_notification_status),
    path('web-consent', views.create_web_user),
    path('app-consent', views.update_app_consent),
]
