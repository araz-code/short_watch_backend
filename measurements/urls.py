from django.urls import path
from . import views
from .views import AllMeasurementsAPI, LatestMeasurementAPI

urlpatterns = [
    path('create/', views.create_measurement, name='create_measurement'),
    path("", AllMeasurementsAPI.as_view(), name="all_measurements_api"),
    path("latest/", LatestMeasurementAPI.as_view(), name="latest_measurement_api"),
]