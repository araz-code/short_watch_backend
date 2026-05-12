"""
Management command to fetch MAR Article 19 insider transactions from gopublic.dk,
extract structured data from PDFs using Claude AI, and store in the database.

Usage:
    python manage.py fetch_insider_transactions
    python manage.py fetch_insider_transactions --pages 5
    python manage.py fetch_insider_transactions --refetch <announcement_id>
"""
import json
import os
import tempfile
from datetime import datetime

import fitz  # PyMuPDF
import requests
from anthropic import Anthropic
from django.core.cache import cache
from django.core.management.base import BaseCommand

from insider_transactions.models import InsiderIssuer, InsiderTransaction, ProcessedAnnouncement

GOPUBLIC_BASE = "https://appft.gold.extension.gopublic.dk"
MODULE_ID = "9217fa13-5d9a-46c6-9921-69ee7e6cfaf6"
SEARCH_URL = f"{GOPUBLIC_BASE}/api/{MODULE_ID}/search"
DETAILS_URL = f"{GOPUBLIC_BASE}/api/{MODULE_ID}/details"

HEADERS = {
    "accept": "*/*",
    "content-type": "application/json",
    "origin": GOPUBLIC_BASE,
}

EXTRACT_PROMPT = """You are extracting insider transaction data from a Danish regulatory notification (MAR Article 19).

The document is the standardized Danish form for reporting trades by company insiders (managers, board members, and their closely associated persons). It may contain multiple transactions from different people.

Extract ALL transactions you find and return them as a JSON array. Each transaction should have these fields:
- person_name: Full name of the person who made the transaction, exactly as written in the document including all middle names — never abbreviate or drop any part of the name (string)
- person_role_en: Their role/title in English e.g. "Chief Executive Officer", "Board Member" (string, empty if not found)
- person_role_da: Their role/title in Danish e.g. "Administrerende direktør", "Bestyrelsesmedlem" (string, empty if not found)
- closely_associated_to: Name of the insider if this is a closely associated person (string, empty if not applicable)
- transaction_type: "Køb" (buy) or "Salg" (sell) or "Tildeling" (grant/allocation/award) or the exact term from the document (string)
- instrument_type: e.g. "Aktier", "Warrants", "Optioner" (string)
- instrument_name: Name of the financial instrument (string, may be company name)
- isin: ISIN code (string, empty if not found)
- transaction_date: Date as YYYY-MM-DD (string, null if unclear)
- volume: Number of units traded (number, null if unclear)
- unit_price: Price per unit (number, null if unclear)
- currency: Currency code e.g. "DKK", "EUR" (string, empty if not found)
- total_amount: Total transaction value (number, null if unclear)
- venue: Trading venue e.g. "XCSE", "XSTO" (string, empty if not found)
- extraction_notes_en: Any caveats or notes about the extraction, written in English (string, empty if clean)
- extraction_notes_da: The same caveats or notes, written in Danish (string, empty if clean)

Rules:
- IMPORTANT: Only extract transactions made by named individual persons (e.g. a CEO, board member, or their closely associated person buying/selling shares). If the document is a company share buyback program (tilbagekøbsprogram) where the company itself is repurchasing its own shares, return []
- If the document is a summary or list of associated persons without actual transaction details (no price, no volume, no date), return []
- If the document contains multiple separate notification forms (one per person), create one transaction per person per date
- Name consistency: if the same person appears multiple times in the document under slightly different spellings (e.g. "Carsten Egeriis" vs "Carsten Rasch Egeriis"), always use the most complete version of the name across all their transactions
- ISIN: if the document mentions a temporary ISIN alongside a permanent/existing ISIN (e.g. "temporary ISIN code X (to be merged with existing ISIN code Y)"), always use the permanent/existing ISIN Y
- Number format: detect from the document language. Danish documents use period as thousands separator and comma as decimal (e.g. "1.234,56" = 1234.56). English documents use comma as thousands separator and period as decimal (e.g. "1,234.56" = 1234.56). Use context clues like "DKK 329.30" to determine which format applies
- Return only valid JSON array, no markdown formatting
- If no transactions found, return []

Document text:
"""


class Command(BaseCommand):
    help = "Fetch MAR Article 19 insider transactions from gopublic.dk"

    def add_arguments(self, parser):
        parser.add_argument(
            "--pages",
            type=int,
            default=2,
            help="Number of pages to fetch from the search API (25 per page)",
        )
        parser.add_argument(
            "--refetch",
            type=str,
            help="Re-fetch and re-extract a specific announcement ID",
        )

    def handle(self, *args, **options):
        from django.conf import settings as django_settings
        api_key = getattr(django_settings, "ANTHROPIC_API_KEY", None) or os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            self.stderr.write("ANTHROPIC_API_KEY not set")
            return

        self.client = Anthropic(api_key=api_key)
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

        if options["refetch"]:
            self._process_announcement(options["refetch"], force=True)
            return

        pages = options["pages"]
        new_count = 0
        skip_count = 0

        for page in range(1, pages + 1):
            self.stdout.write(f"Fetching page {page}/{pages}...")
            rows = self._fetch_page(page)
            if not rows:
                break

            for row in rows:
                announcement_id = row["id"]
                if ProcessedAnnouncement.objects.filter(announcement_id=announcement_id).exists():
                    skip_count += 1
                    continue

                count = self._process_announcement(announcement_id)
                new_count += count

        # cache.delete("insider_issuers_list")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. New transactions: {new_count}, skipped (already stored): {skip_count}"
            )
        )

    def _get_django_setting(self, key):
        try:
            from django.conf import settings
            return getattr(settings, key, None)
        except Exception:
            return None

    def _fetch_page(self, page: int) -> list:
        payload = {
            "query": "",
            "filters": [
                {
                    "type": "dropdown",
                    "key": "CategoryFilter",
                    "options": ["RelatedPartyTransactions"],
                }
            ],
            "page": page,
            "pageSize": 25,
        }
        try:
            resp = self.session.post(SEARCH_URL, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", {}).get("rows", [])
        except Exception as e:
            self.stderr.write(f"Search page {page} failed: {e}")
            return []

    def _process_announcement(self, announcement_id: str, force: bool = False) -> int:
        if force:
            InsiderTransaction.objects.filter(announcement_id=announcement_id).delete()

        try:
            details = self._fetch_details(announcement_id)
        except Exception as e:
            self.stderr.write(f"Details fetch failed for {announcement_id}: {e}")
            return 0

        issuer_info = self._extract_issuer_info(details)
        if not issuer_info["cvr"]:
            self.stdout.write(f"  Skipping {announcement_id}: no CVR found")
            return 0

        published_date = self._extract_published_date(details)
        person_name = self._extract_person_name(details)

        if not person_name:
            self.stdout.write(f"  Skipping {announcement_id}: no individual person (likely a buyback program)")
            self._mark_processed(announcement_id, "Skipped: no individual person named (likely a company buyback program)")
            return 0

        issuer, created = InsiderIssuer.objects.get_or_create(
            cvr=issuer_info["cvr"],
            defaults={
                "name": issuer_info["name"],
                "lei": issuer_info["lei"],
            },
        )
        if not created and issuer_info["lei"] and issuer.lei != issuer_info["lei"]:
            issuer.lei = issuer_info["lei"]
            issuer.save(update_fields=["lei"])

        # Sync symbol from Stock table if not already set
        if not issuer.symbol:
            from shorts.models import Stock
            isin_to_symbol = dict(Stock.objects.filter(active=True).values_list("code", "symbol"))
            isins = InsiderTransaction.objects.filter(issuer=issuer, isin__gt="").values_list("isin", flat=True).distinct()
            for isin in isins:
                if isin in isin_to_symbol:
                    issuer.symbol = isin_to_symbol[isin]
                    issuer.save(update_fields=["symbol"])
                    break

        # Skip inactive issuers
        if not issuer.active:
            self.stdout.write(f"  Skipping {announcement_id}: issuer {issuer.name} is deactivated")
            self._mark_processed(announcement_id, f"Skipped: issuer deactivated")
            return 0

        pdf_urls = self._extract_pdf_urls(details)
        if not pdf_urls:
            self.stdout.write(f"  No PDFs for {announcement_id}, skipping")
            self._mark_processed(announcement_id, "Skipped: no PDF attachments found in announcement")
            return 0

        all_transactions = []
        pdf_errors = []
        source_url = pdf_urls[0] if pdf_urls else ""
        for url in pdf_urls:
            text = self._extract_pdf_text(url)
            if not text:
                pdf_errors.append(f"PDF unreadable: {url.split('/')[-1]}")
                continue
            transactions = self._extract_with_ai(text)
            if not transactions:
                pdf_errors.append(f"AI returned no transactions for: {url.split('/')[-1]}")
            for tx in transactions:
                tx["_source_url"] = url
            all_transactions.extend(transactions)

        if not all_transactions:
            reason = "; ".join(pdf_errors) if pdf_errors else "AI returned no transactions from any PDF"
            self.stdout.write(f"  No transactions extracted for {announcement_id}")
            self._mark_processed(announcement_id, reason[:500])
            return 0

        # Deduplicate within this announcement (multiple PDFs can repeat the same transaction)
        seen_keys = set()
        deduped = []
        for tx in all_transactions:
            key = (
                (tx.get("person_name") or "").lower().strip(),
                tx.get("transaction_date") or "",
                str(tx.get("volume") or ""),
                (tx.get("isin") or "").strip()[:20],
                (tx.get("transaction_type") or "").lower().strip(),
            )
            if key not in seen_keys:
                seen_keys.add(key)
                deduped.append(tx)
        all_transactions = deduped

        saved = 0
        skipped_empty = 0
        skipped_dupe = 0
        for tx in all_transactions:
            tx_date = self._parse_date(tx.get("transaction_date"))
            tx_volume = tx.get("volume")
            tx_isin = (tx.get("isin") or "")[:20]
            tx_type = tx.get("transaction_type", "")
            tx_person = tx.get("person_name") or person_name or ""

            # Skip rows with no meaningful data
            if not tx_date and not tx_volume and not tx_isin and not tx_type:
                skipped_empty += 1
                continue

            # Skip cross-announcement duplicates: same person/date/volume/ISIN already stored
            if InsiderTransaction.objects.filter(
                issuer=issuer,
                person_name=tx_person,
                transaction_date=tx_date,
                volume=tx_volume,
                isin=tx_isin,
            ).exists():
                skipped_dupe += 1
                continue

            try:
                InsiderTransaction.objects.create(
                    issuer=issuer,
                    announcement_id=announcement_id,
                    published_date=published_date,
                    person_name=tx_person,
                    person_role=self._build_bilingual(tx, "person_role"),
                    closely_associated_to=tx.get("closely_associated_to", ""),
                    transaction_type=tx_type,
                    instrument_type=tx.get("instrument_type", ""),
                    instrument_name=tx.get("instrument_name", ""),
                    isin=tx_isin,
                    transaction_date=tx_date,
                    volume=tx_volume,
                    unit_price=tx.get("unit_price"),
                    currency=tx.get("currency", ""),
                    total_amount=tx.get("total_amount"),
                    venue=tx.get("venue", ""),
                    source_url=tx.get("_source_url", source_url),
                    extraction_notes=self._build_bilingual(tx, "extraction_notes"),
                )
                saved += 1
            except Exception as e:
                self.stderr.write(f"  Save failed for tx in {announcement_id}: {e}")

        if skipped_empty:
            self.stdout.write(f"  Skipped {skipped_empty} empty row(s)")
        if skipped_dupe:
            self.stdout.write(f"  Skipped {skipped_dupe} cross-announcement duplicate(s)")

        self._mark_processed(announcement_id)
        self.stdout.write(f"  {announcement_id}: saved {saved} transactions for {issuer.name}")
        self._normalize_person_names(issuer)
        # cache.delete(f"insider_issuer_{issuer.cvr}")
        return saved

    def _mark_processed(self, announcement_id: str, skip_reason: str = "") -> None:
        obj, created = ProcessedAnnouncement.objects.get_or_create(announcement_id=announcement_id)
        if skip_reason and obj.skip_reason != skip_reason:
            obj.skip_reason = skip_reason
            obj.save(update_fields=["skip_reason"])

    def _normalize_person_names(self, issuer) -> None:
        """Promote shorter name variants to the most complete version seen for this issuer.

        If "Carsten Egeriis" and "Carsten Rasch Egeriis" both exist, every row
        with the shorter name is updated to the longer one.
        """
        names = list(
            InsiderTransaction.objects.filter(issuer=issuer)
            .values_list("person_name", flat=True)
            .distinct()
        )
        for name in names:
            name_words = set(name.lower().split())
            for other in names:
                if name == other or not name:
                    continue
                other_words = set(other.lower().split())
                # Promote if all words in the shorter name appear in the longer name
                # (handles inserted middle names, e.g. "Carsten Egeriis" -> "Carsten Rasch Egeriis")
                if name_words < other_words:
                    count = InsiderTransaction.objects.filter(
                        issuer=issuer, person_name=name
                    ).update(person_name=other)
                    if count:
                        self.stdout.write(f"  Normalized '{name}' → '{other}' ({count} rows)")

    def _fetch_details(self, announcement_id: str) -> dict:
        resp = self.session.get(f"{DETAILS_URL}/{announcement_id}", timeout=30)
        resp.raise_for_status()
        return resp.json()

    def _extract_issuer_info(self, details: dict) -> dict:
        result = {"cvr": "", "name": "", "lei": ""}
        for section in details.get("sections", []):
            if section.get("heading") == "Issuer":
                for el in section.get("elements", []):
                    key = el.get("key", {}).get("name", "")
                    val = el.get("value", {}).get("value", "")
                    if key == "Company":
                        result["name"] = val
                    elif key == "National business ID":
                        # Strip country prefix like "DK-" if present
                        result["cvr"] = val.removeprefix("DK-").strip()
                    elif key == "LEI code":
                        result["lei"] = val
        return result

    def _extract_published_date(self, details: dict) -> str:
        for section in details.get("sections", []):
            if section.get("heading") == "Time":
                for el in section.get("elements", []):
                    if el.get("key", {}).get("name") == "Published":
                        raw = el.get("value", {}).get("value", "")
                        try:
                            return datetime.strptime(raw, "%d-%m-%Y %H:%M:%S").date()
                        except ValueError:
                            pass
        return None

    def _extract_person_name(self, details: dict) -> str:
        for section in details.get("sections", []):
            if section.get("heading") == "Manager or related party":
                for el in section.get("elements", []):
                    val = el.get("value", {}).get("value", "")
                    if val:
                        return val
        return ""

    def _extract_pdf_urls(self, details: dict) -> list[str]:
        urls = []
        for section in details.get("sections", []):
            for el in section.get("elements", []):
                val = el.get("value", {})
                if val.get("type") == "link":
                    title = val.get("title", "")
                    url = val.get("url", "")
                    if not url.endswith(".pdf"):
                        continue
                    # Prefer Danish PDFs; collect them
                    if "(Danish)" in title or "-da_" in url or "Bilag" in title:
                        urls.append(url)

        # If no Danish PDFs, fall back to any PDF
        if not urls:
            for section in details.get("sections", []):
                for el in section.get("elements", []):
                    val = el.get("value", {})
                    if val.get("type") == "link" and val.get("url", "").endswith(".pdf"):
                        urls.append(val["url"])

        return urls

    def _extract_pdf_text(self, url: str) -> str:
        try:
            resp = self.session.get(url, timeout=60)
            resp.raise_for_status()
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                f.write(resp.content)
                tmp_path = f.name
            try:
                doc = fitz.open(tmp_path)
                text = "\n".join(page.get_text() for page in doc)
                doc.close()
                return text.strip()
            finally:
                os.unlink(tmp_path)
        except Exception as e:
            self.stderr.write(f"  PDF extract failed ({url}): {e}")
            return ""

    def _extract_with_ai(self, pdf_text: str) -> list[dict]:
        if not pdf_text:
            return []
        # Cap input — buybacks are already filtered before reaching here,
        # so remaining PDFs are personal trade forms (typically 2-6 pages)
        if len(pdf_text) > 30000:
            pdf_text = pdf_text[:30000]
        try:
            message = self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=8192,
                messages=[
                    {
                        "role": "user",
                        "content": EXTRACT_PROMPT + pdf_text,
                    }
                ],
            )
            raw = message.content[0].text.strip()
            if not raw:
                self.stderr.write("  AI returned empty response")
                return []
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            if not raw:
                return []
            return self._parse_json(raw)
        except Exception as e:
            self.stderr.write(f"  AI extraction failed: {e}")
            return []

    def _parse_json(self, raw: str) -> list[dict]:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        # Attempt recovery: find the last complete object and close the array
        last_close = raw.rfind("}")
        if last_close == -1:
            return []
        truncated = raw[: last_close + 1]
        # Strip trailing comma if present before closing
        truncated = truncated.rstrip().rstrip(",")
        try:
            return json.loads(truncated + "]")
        except json.JSONDecodeError as e:
            self.stderr.write(f"  JSON recovery failed: {e}")
            return []

    def _build_bilingual(self, tx: dict, key: str) -> str:
        """Store en/da pair as JSON. Falls back to plain key for legacy single-value fields."""
        en = (tx.get(f"{key}_en") or tx.get(key) or "").strip()
        da = (tx.get(f"{key}_da") or "").strip()
        if not en and not da:
            return ""
        return json.dumps({"en": en, "da": da}, ensure_ascii=False)

    def _parse_date(self, value) -> object:
        if not value:
            return None
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None
