from django.contrib import admin

from shorts.models import ShortedStock, RunStatus, SymbolMap, ShortSeller, ShortedStockChart


@admin.register(ShortedStock)
class ShortedStockAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'code', 'name', 'value')
    list_filter = ('name', 'timestamp')
    ordering = ('-timestamp', 'code')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return True

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


@admin.register(SymbolMap)
class NameSymbolMapAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'symbol')
    ordering = ('name',)


@admin.register(ShortSeller)
class ShortSellerAdmin(admin.ModelAdmin):
    list_display = ('date', 'name', 'business_id', 'stock_code', 'stock_name', 'value')
    list_filter = ('name', 'date')
    ordering = ('-date', 'name')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(ShortedStockChart)
class ShortedStockChartAdmin(admin.ModelAdmin):
    list_display = ('date', 'code', 'name', 'value')
    list_filter = ('name', 'code', 'date')
    ordering = ('-date', 'code')

    def has_add_permission(self, request):
        return True

    def has_change_permission(self, request, obj=None):
        return True

    def has_delete_permission(self, request, obj=None):
        return True
