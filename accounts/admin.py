from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from accounts.models import ShortWatchUser


@admin.register(ShortWatchUser)
class ShortWatchAdmin(UserAdmin):
    list_display = ('username', 'is_active', 'is_staff')
    ordering = ('username',)
    list_filter = ('is_active',)

    fieldsets = (
        (None, {'fields': ('username', 'is_active', 'is_staff')}),
    )
