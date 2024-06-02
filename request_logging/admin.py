import json

from django.contrib import admin
from django.contrib.admin import display

from request_logging.models import RequestLog, Visitor, VisitorLock


@admin.register(RequestLog)
class RequestLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'client_ip', 'user_agent', 'requested_url', 'referer')
    list_filter = ('timestamp', 'client_ip', 'user_agent', 'requested_url', 'referer', 'processed')
    search_fields = ('requested_url', 'referer')

    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ('client_ip', 'first', 'previous', 'last', 'visits', 'visits_today', 'version',
                    'watch_pretty', 'pick_pretty', 'web', 'visits_web', 'iphone', 'visits_iphone', 'ipad',
                    'visits_ipad', 'iwatch', 'visits_iwatch', 'referer_pretty')
    list_filter = ('client_ip', 'first', 'previous', 'last', 'version', 'web', 'iphone', 'ipad', 'iwatch')
    search_fields = ('client_ip', 'previous', 'last', 'watch', 'pick', 'referer')

    ordering = ('-last',)

    @staticmethod
    @display(description='watch')
    def watch_pretty(obj: Visitor) -> str:
        if obj.watch:
            watch_dict = json.loads(obj.watch)
            res = ''
            for key, value in watch_dict.items():
                res += f'{key.replace("-", "")}={value}\n'
            return res
        return '-'

    @staticmethod
    @display(description='watch')
    def pick_pretty(obj: Visitor) -> str:
        if obj.pick:
            pick_dict = json.loads(obj.pick)
            res = ''
            for key, value in pick_dict.items():
                res += f'{key.replace("-", "")}={value}\n'
            return res
        return '-'

    @staticmethod
    @display(description='watch')
    def referer_pretty(obj: Visitor) -> str:
        if obj.referer:
            referer_dict = json.loads(obj.referer)
            res = ''
            for key, value in referer_dict.items():
                res += f'{key}={value}\n'
            return res
        return '-'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(VisitorLock)
class VisitorLockAdmin(admin.ModelAdmin):
    list_display = ('created_at',)
