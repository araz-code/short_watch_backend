from django.contrib import admin
from .models import Measurement


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ("user_id", "temperature", "humidity", "lux", "white", "als", "db", "aqi", "tvoc", "eco2",
                    "created_at")
    list_filter = ("created_at",)
    search_fields = ("user_id",)
    ordering = ("-created_at",)
