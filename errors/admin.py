from django.contrib import admin

from errors.models import Error


@admin.register(Error)
class ErrorAdmin(admin.ModelAdmin):
    list_display = ('date', 'message')
    list_filter = ('date',)
    ordering = ('-date',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True
