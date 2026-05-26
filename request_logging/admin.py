from django.contrib import admin
from django.contrib.admin import display

from request_logging.models import RequestLog, ContactSubmission, PageFeedback


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


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'category', 'sender', 'message_preview', 'read')
    list_filter = ('read', 'category', 'created_at')
    search_fields = ('email', 'message')
    readonly_fields = ('created_at', 'category', 'message', 'email', 'client_ip', 'user_agent')
    actions = ['mark_as_read', 'mark_as_unread']
    ordering = ('-created_at',)

    @staticmethod
    @display(description='From')
    def sender(obj: ContactSubmission) -> str:
        return obj.email or '(anonymous)'

    @staticmethod
    @display(description='Message')
    def message_preview(obj: ContactSubmission) -> str:
        return obj.message[:80] + ('…' if len(obj.message) > 80 else '')

    @admin.action(description='Mark selected as read')
    def mark_as_read(self, _request, queryset):
        queryset.update(read=True)

    @admin.action(description='Mark selected as unread')
    def mark_as_unread(self, _request, queryset):
        queryset.update(read=False)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PageFeedback)
class PageFeedbackAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'sentiment', 'page_type', 'page_id', 'comment_preview', 'read')
    list_filter = ('read', 'sentiment', 'page_type', 'created_at')
    search_fields = ('page_id', 'comment')
    readonly_fields = ('created_at', 'sentiment', 'page_type', 'page_id', 'comment', 'client_ip', 'user_agent')
    actions = ['mark_as_read', 'mark_as_unread']
    ordering = ('-created_at',)

    @staticmethod
    @display(description='Comment')
    def comment_preview(obj: PageFeedback) -> str:
        if not obj.comment:
            return '—'
        return obj.comment[:80] + ('…' if len(obj.comment) > 80 else '')

    @admin.action(description='Mark selected as read')
    def mark_as_read(self, _request, queryset):
        queryset.update(read=True)

    @admin.action(description='Mark selected as unread')
    def mark_as_unread(self, _request, queryset):
        queryset.update(read=False)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
