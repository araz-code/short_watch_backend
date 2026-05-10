import json
from datetime import date, timedelta
from decimal import Decimal

from rest_framework import serializers
from insider_transactions.models import InsiderIssuer, InsiderTransaction
from insider_transactions.utils import categorize_transaction_type


def _parse_bilingual(raw: str, lang: str) -> str:
    """Return the requested language from a JSON-encoded bilingual field.
    Falls back gracefully for legacy plain-text rows."""
    if not raw:
        return ""
    if raw.startswith("{"):
        try:
            data = json.loads(raw)
            return data.get(lang, "") or ""
        except (json.JSONDecodeError, AttributeError):
            pass
    # Legacy plain text: expose as English only
    return raw if lang == "en" else ""


class InsiderTransactionSerializer(serializers.ModelSerializer):
    transaction_category = serializers.SerializerMethodField()
    person_role = serializers.SerializerMethodField()
    person_role_da = serializers.SerializerMethodField()
    extraction_notes = serializers.SerializerMethodField()
    extraction_notes_da = serializers.SerializerMethodField()

    def get_transaction_category(self, obj):
        return categorize_transaction_type(obj.transaction_type)

    def get_person_role(self, obj):
        return _parse_bilingual(obj.person_role, "en")

    def get_person_role_da(self, obj):
        return _parse_bilingual(obj.person_role, "da")

    def get_extraction_notes(self, obj):
        return _parse_bilingual(obj.extraction_notes, "en")

    def get_extraction_notes_da(self, obj):
        return _parse_bilingual(obj.extraction_notes, "da")

    class Meta:
        model = InsiderTransaction
        fields = [
            "id",
            "announcement_id",
            "published_date",
            "person_name",
            "person_role",
            "person_role_da",
            "closely_associated_to",
            "transaction_type",
            "transaction_category",
            "instrument_type",
            "instrument_name",
            "isin",
            "transaction_date",
            "volume",
            "unit_price",
            "currency",
            "total_amount",
            "venue",
            "source_url",
            "extraction_notes",
            "extraction_notes_da",
        ]


class InsiderIssuerListSerializer(serializers.ModelSerializer):
    transaction_count = serializers.IntegerField(read_only=True)
    latest_date = serializers.DateField(read_only=True)
    earliest_date = serializers.DateField(read_only=True)

    class Meta:
        model = InsiderIssuer
        fields = ["cvr", "name", "lei", "symbol", "transaction_count", "latest_date", "earliest_date", "updated_at"]


class InsiderIssuerDetailSerializer(serializers.ModelSerializer):
    transactions = serializers.SerializerMethodField()
    signal = serializers.SerializerMethodField()

    def get_transactions(self, obj):
        qs = obj.transactions.order_by("-transaction_date", "-published_date")
        return InsiderTransactionSerializer(qs, many=True).data

    def get_signal(self, obj):
        cutoff = date.today() - timedelta(days=90)
        recent = obj.transactions.filter(transaction_date__gte=cutoff)

        buy_amount = Decimal("0")
        sell_amount = Decimal("0")
        for tx in recent:
            category = categorize_transaction_type(tx.transaction_type)
            amount = tx.total_amount or Decimal("0")
            # Grants count as buys for the sentiment signal
            if category in ("buy", "grant"):
                buy_amount += amount
            elif category == "sell":
                sell_amount += amount

        if buy_amount == 0 and sell_amount == 0:
            signal = "neutral"
        elif buy_amount >= sell_amount:
            signal = "bullish"
        else:
            signal = "bearish"

        return {
            "signal": signal,
            "buy_amount_90d": float(buy_amount),
            "sell_amount_90d": float(sell_amount),
        }

    class Meta:
        model = InsiderIssuer
        fields = ["cvr", "name", "lei", "updated_at", "transactions", "signal"]
