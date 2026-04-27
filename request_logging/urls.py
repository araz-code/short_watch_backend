from django.urls import path
from request_logging import views

urlpatterns = [
    # Stat cards
    path('chart/total/', views.get_total_requests),
    path('chart/total-today/', views.get_total_requests_today),
    path('chart/total-unique-ips-today/', views.get_unique_ips_today),
    path('chart/latest-request-timestamp/', views.get_latest_request_timestamp),

    # Charts
    path('chart/requests-week/', views.get_requests_week_chart),
    path('chart/requests-hourly/', views.get_request_per_hour_chart),
    path('chart/pick-requests-hourly/', views.get_pick_request_per_hour_chart),
    path('chart/watch-requests-hourly/', views.get_watch_request_per_hour_chart),

    # Tables
    path('chart/static-pages/', views.get_static_pages_table),
    path('chart/versions/', views.get_versions_table),
    path('chart/referers/', views.get_referers_table),
    path('chart/pick-history/', views.get_pick_history_table),
    path('chart/watch-history/', views.get_watch_history_table),
    path('chart/unique-ips/', views.get_unique_ips_per_day_table),
    path('chart/visits-by-platform/', views.get_visits_by_platform_table),
    path('chart/visits-by-section/', views.get_visits_by_section_table),

    # Tracking
    path('clicked/<str:code>', views.clicked),
    path('visit/<str:page>/', views.track_visit),
]
