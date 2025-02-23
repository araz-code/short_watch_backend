from django.contrib import admin
from .models import Measurement


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ("user_id", "temperature", "humidity", "light_level", "noise_level", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user_id",)
    ordering = ("-created_at",)
