from django.contrib import admin
from django.db.models import Count

from users.models import AppUser, WebUser


@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    list_display = ('last_activity', 'user_id', 'num_stocks', 'notifications_sent', 'notification_active',
                    'old_notification_active', 'device', 'version',
                    'consent_accepted', 'old_consent_accepted', 'consent_date',
                    'invalid', 'date_added', 'fcm_token')

    ordering = ('-last_activity',)
    list_filter = ('device', 'last_activity', 'notification_active', 'old_notification_active', 'date_added',
                   'consent_accepted', 'old_consent_accepted', 'consent_date',
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


@admin.register(WebUser)
class WebUserAdmin(admin.ModelAdmin):
    list_display = ('last_activity', 'user_id', 'consent_accepted', 'old_consent_accepted', 'date_added', 'client_ip')
    ordering = ('-last_activity',)
    list_filter = ('last_activity', 'consent_accepted', 'old_consent_accepted', 'date_added', 'client_ip')
