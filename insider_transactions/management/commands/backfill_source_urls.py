"""
Backfills source_url on existing InsiderTransaction rows by fetching
PDF URLs from gopublic without re-running AI extraction.
"""
import requests
from django.core.management.base import BaseCommand

from insider_transactions.models import InsiderTransaction

GOPUBLIC_BASE = "https://appft.gold.extension.gopublic.dk"
MODULE_ID = "9217fa13-5d9a-46c6-9921-69ee7e6cfaf6"
DETAILS_URL = f"{GOPUBLIC_BASE}/api/{MODULE_ID}/details"

HEADERS = {
    "accept": "*/*",
    "content-type": "application/json",
    "origin": GOPUBLIC_BASE,
}


class Command(BaseCommand):
    help = "Backfill source_url on existing transactions from gopublic"

    def handle(self, *args, **options):
        session = requests.Session()
        session.headers.update(HEADERS)

        announcement_ids = (
            InsiderTransaction.objects.filter(source_url="")
            .values_list("announcement_id", flat=True)
            .distinct()
        )

        total = len(announcement_ids)
        self.stdout.write(f"Backfilling {total} announcements...")

        for i, announcement_id in enumerate(announcement_ids, 1):
            try:
                resp = session.get(f"{DETAILS_URL}/{announcement_id}", timeout=30)
                resp.raise_for_status()
                details = resp.json()

                pdf_url = self._find_pdf_url(details)
                if not pdf_url:
                    self.stdout.write(f"  [{i}/{total}] {announcement_id}: no PDF found")
                    continue

                updated = InsiderTransaction.objects.filter(
                    announcement_id=announcement_id, source_url=""
                ).update(source_url=pdf_url)

                self.stdout.write(f"  [{i}/{total}] {announcement_id}: updated {updated} rows")
            except Exception as e:
                self.stderr.write(f"  [{i}/{total}] {announcement_id}: failed - {e}")

        self.stdout.write(self.style.SUCCESS("Done."))

    def _find_pdf_url(self, details: dict) -> str:
        # Prefer Danish PDF
        for section in details.get("sections", []):
            for el in section.get("elements", []):
                val = el.get("value", {})
                if val.get("type") == "link":
                    url = val.get("url", "")
                    title = val.get("title", "")
                    if url.endswith(".pdf") and ("Danish" in title or "-da_" in url or "Bilag" in title):
                        return url
        # Fall back to any PDF
        for section in details.get("sections", []):
            for el in section.get("elements", []):
                val = el.get("value", {})
                if val.get("type") == "link" and val.get("url", "").endswith(".pdf"):
                    return val["url"]
        return ""
