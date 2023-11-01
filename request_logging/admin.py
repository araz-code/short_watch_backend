from django.contrib import admin

from request_logging.models import RequestLog


@admin.register(RequestLog)
class ErrorAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'client_ip', 'user_agent', 'requested_url', 'referer')
    list_filter = ('timestamp', 'client_ip', 'user_agent', 'requested_url', 'referer')
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True
