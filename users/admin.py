from django.contrib import admin
from django.contrib.admin import display
from django.db.models import Count

from users.models import AppUser


@admin.register(AppUser)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('last_activity', 'user_id', 'num_stocks', 'notifications_sent', 'notification_active',
                    'old_notification_active', 'device', 'version', 'invalid', 'date_added', 'fcm_token')
    ordering = ('-last_activity',)
    list_filter = ('device', 'last_activity', 'notification_active', 'old_notification_active', 'date_added',
                   'invalid', "version")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.annotate(num_stocks=Count('stocks'))
        return qs

    @staticmethod
    @admin.display(description='num stocks', ordering='num_stocks')
    def num_stocks(obj: AppUser) -> int:
        if obj.stocks:
            return len(obj.stocks.all())
        return 0
