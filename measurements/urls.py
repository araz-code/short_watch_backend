from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_measurement, name='create_measurement'),
]