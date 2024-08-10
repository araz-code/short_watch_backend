from django.contrib import admin
from django.contrib.admin import display

from shorts.models import ShortPosition, RunStatus, Stock, ShortSeller, ShortPositionChart, CompanyMap, Announcement


@admin.register(ShortPosition)
class ShortPositionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'code', 'symbol', 'name', 'value', 'prev_value')
    list_filter = ('stock__name', 'timestamp')
    ordering = ('-timestamp', 'stock__code')

    @staticmethod
    @display(description='code', ordering='stock__code')
    def code(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.code
        return '-'

    @staticmethod
    @display(description='symbol', ordering='stock__symbol')
    def symbol(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.symbol
        return '-'

    @staticmethod
    @display(description='name', ordering='stock__name')
    def name(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.name
        return '-'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(RunStatus)
class RunStatusAdmin(admin.ModelAdmin):
    list_display = ('executed_at',)
    list_filter = ('executed_at',)
    ordering = ('-executed_at',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'symbol')
    ordering = ('name',)


@admin.register(ShortSeller)
class ShortSellerAdmin(admin.ModelAdmin):
    list_display = ('date', 'name', 'business_id', 'stock_code', 'stock_symbol', 'stock_name', 'value')
    list_filter = ('stock__name', 'date')
    ordering = ('-date', 'stock__name')

    @staticmethod
    @display(description='stock code', ordering='stock__code')
    def stock_code(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.code
        return '-'

    @staticmethod
    @display(description='stock symbol', ordering='stock__symbol')
    def stock_symbol(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.symbol
        return '-'

    @staticmethod
    @display(description='stock name', ordering='stock__name')
    def stock_name(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.name
        return '-'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(ShortPositionChart)
class ShortPositionChartAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'date', 'code', 'symbol', 'name', 'value')
    list_filter = ('stock__name', 'date')
    ordering = ('-timestamp', 'stock__code')

    @staticmethod
    @display(description='code', ordering='stock__code')
    def code(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.code
        return '-'

    @staticmethod
    @display(description='symbol', ordering='stock__symbol')
    def symbol(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.symbol
        return '-'

    @staticmethod
    @display(description='name', ordering='stock__name')
    def name(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.name
        return '-'

    def has_add_permission(self, request):
        return True

    def has_change_permission(self, request, obj=None):
        return True

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(CompanyMap)
class CompanyMapAdmin(admin.ModelAdmin):
    list_display = ('announced_company_name', 'issuer_name', 'code', 'symbol', 'name', 'handled')
    ordering = ('announced_company_name', 'issuer_name')
    list_filter = ('handled',)

    @staticmethod
    @display(description='code', ordering='stock__code')
    def code(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.code
        return '-'

    @staticmethod
    @display(description='symbol', ordering='stock__symbol')
    def symbol(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.symbol
        return '-'

    @staticmethod
    @display(description='name', ordering='stock__name')
    def name(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.name
        return '-'


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('published_date', 'name', 'headline')
    ordering = ('-published_date',)
    list_filter = ('stock__name',)

    @staticmethod
    @display(description='code', ordering='stock__code')
    def code(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.code
        return '-'

    @staticmethod
    @display(description='symbol', ordering='stock__symbol')
    def symbol(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.symbol
        return '-'

    @staticmethod
    @display(description='name', ordering='stock__name')
    def name(obj: ShortPosition) -> str:
        if obj.stock:
            return obj.stock.name
        return '-'
