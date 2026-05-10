from django.contrib import admin
from django.utils.html import format_html
from insider_transactions.models import InsiderIssuer, InsiderTransaction, ProcessedAnnouncement


class IssuerFilter(admin.SimpleListFilter):
    title = "Company"
    parameter_name = "issuer"

    def lookups(self, request, model_admin):
        issuers = InsiderIssuer.objects.order_by("name")
        return [(i.cvr, i.name) for i in issuers]

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        ann_ids = InsiderTransaction.objects.filter(
            issuer__cvr=self.value()
        ).values_list("announcement_id", flat=True).distinct()
        return queryset.filter(announcement_id__in=ann_ids)

GOPUBLIC_BASE = "https://appft.gold.extension.gopublic.dk"
MODULE_ID = "9217fa13-5d9a-46c6-9921-69ee7e6cfaf6"


class InsiderTransactionInline(admin.TabularInline):
    model = InsiderTransaction
    extra = 0
    readonly_fields = [
        "announcement_id", "published_date", "person_name", "person_role",
        "closely_associated_to", "transaction_type", "instrument_type",
        "instrument_name", "isin", "transaction_date", "volume", "unit_price",
        "currency", "total_amount", "venue", "extraction_notes",
    ]
    can_delete = False


@admin.register(InsiderIssuer)
class InsiderIssuerAdmin(admin.ModelAdmin):
    list_display = ["name", "symbol", "cvr", "active", "updated_at"]
    list_editable = ["symbol", "active"]
    list_filter = ["active"]
    search_fields = ["name", "cvr", "symbol"]
    inlines = [InsiderTransactionInline]


@admin.register(ProcessedAnnouncement)
class ProcessedAnnouncementAdmin(admin.ModelAdmin):
    list_display = ["announcement_link", "company_name", "processed_at", "skip_reason"]
    search_fields = ["announcement_id", "skip_reason"]
    # Note: company name search works via the IssuerFilter sidebar
    list_filter = [IssuerFilter, ("skip_reason", admin.EmptyFieldListFilter)]
    readonly_fields = ["announcement_id", "processed_at", "skip_reason"]

    @admin.display(description="Announcement")
    def announcement_link(self, obj):
        url = f"{GOPUBLIC_BASE}/api/{MODULE_ID}/details/{obj.announcement_id}"
        return format_html('<a href="{}" target="_blank">{}</a>', url, obj.announcement_id)

    @admin.display(description="Company")
    def company_name(self, obj):
        tx = InsiderTransaction.objects.filter(announcement_id=obj.announcement_id).select_related("issuer").first()
        if tx:
            return tx.issuer.name
        return "-"


@admin.register(InsiderTransaction)
class InsiderTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "issuer", "person_name", "transaction_type", "transaction_date",
        "volume", "unit_price", "currency", "published_date",
    ]
    list_filter = ["transaction_type", "currency", "published_date"]
    search_fields = ["issuer__name", "person_name", "isin"]
    readonly_fields = ["created_at"]
