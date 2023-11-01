from django.urls import path
from request_logging import views

urlpatterns = [
    path('chart/filter-options/', views.get_filter_options),
    path('chart/requestlogging/total/<str:year>/', views.get_total_requests),
    path('chart/requestlogging/unique-ips/<str:year>/', views.get_unique_ips),
    path('chart/requestlogging/avg-requests-per-ip/<str:year>/', views.get_avg_request_count),
    path('chart/requestlogging/total-today/', views.get_total_requests_today),
    path('chart/requestlogging/unique-ips-today/', views.get_unique_ips_today),
    path('chart/requestlogging/avg-requests-per-ip-today/', views.get_avg_request_today_count),
]

