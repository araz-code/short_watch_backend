from django.urls import path
from request_logging import views

urlpatterns = [
    path('chart/filter-options/', views.get_filter_options),
    path('chart/requestlogging/total/<str:year>/', views.get_total_requests),
    path('chart/requestlogging/latest-request-timestamp/', views.get_latest_request_timestamp),
    path('chart/requestlogging/total-today/', views.get_total_requests_today),
    path('chart/requestlogging/requested-urls/<str:year>/', views.get_requested_urls_chart),
    path('chart/requestlogging/pick-historic/<str:year>/', views.get_pick_historic_chart),
    path('chart/requestlogging/watch-historic/<str:year>/', views.get_watch_historic_chart),
    path('chart/requestlogging/requests-week/', views.get_requests_week_chart),
]

