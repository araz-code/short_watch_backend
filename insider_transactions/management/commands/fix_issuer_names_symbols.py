"""
One-time script to correct company names and symbols for InsiderIssuers
that are not in the Stock table (based on manual research of Nasdaq Copenhagen).

Usage:
    python manage.py fix_issuer_names_symbols
    python manage.py fix_issuer_names_symbols --dry-run
"""
from django.core.cache import cache
from django.core.management.base import BaseCommand

from insider_transactions.models import InsiderIssuer

# (cvr, correct_name, correct_symbol, notes)
CORRECTIONS = [
    ("27652913", "Better Collective A/S",                           "BETCO",    ""),
    ("31180503", "Cadeler A/S",                                     "CADLR",    "Primary listing: Euronext Oslo"),
    ("24932818", "Cemat A/S",                                       "CEMAT",    ""),
    ("13228345", "Columbus A/S",                                    "COLUM",    ""),
    ("36591528", "Dantax A/S",                                      "DANT",     ""),
    ("14194711", "DFDS A/S",                                        "DFDS",     ""),
    ("40713816", "Djurslands Bank A/S",                             "DJURS",    ""),
    ("30557751", "EgnsINVEST Ejendomme Tyskland A/S",               "EGNETY",   ""),
    ("39703416", "Ennogie Solar Group A/S",                         "ESG",      "Formerly Small Cap Danmark A/S"),
    ("25536606", "FastPassCorp A/S",                                "FASTPC",   ""),
    ("28312504", "FirstFarms A/S",                                  "FFARMS",   ""),
    ("32788718", "Flügger group A/S",                               "FLUG-B",   "Only B shares listed"),
    ("58868728", "Gabriel Holding A/S",                             "GABR",     ""),
    ("10239680", "Glunz & Jensen Holding A/S",                      "GJ",       ""),
    ("35521585", "GreenMobility A/S",                               "GREENM",   ""),
    ("32326676", "Impero A/S",                                      "IMPERO",   "Nasdaq First North"),
    ("32937896", "Investeringsselskabet Artha Optimum A/S",         "ARAOPT",   ""),
    ("14246045", "Jeudan A/S",                                      "JDAN",     ""),
    ("36684828", "Lollands Bank A/S",                               "LOLB",     ""),
    ("16888419", "MT Højgaard Holding A/S",                         "MTHH",     ""),
    ("13255342", "Newcap Holding A/S",                              "NEWCAP",   ""),
    ("66590119", "North Media A/S",                                 "NORTHM",   ""),
    ("12546106", "NTG Nordic Transport Group A/S",                  "NTG",      ""),
    ("62670215", "NTR Holding A/S",                                 "NTR",      ""),
    ("12719280", "Nykredit Realkredit A/S",                         "",         "Bond issuer only — no equity listing"),
    ("32266355", "Strategic Partners A/S",                          "STRAP",    "Formerly Orphazyme A/S, renamed Oct 2024"),
    ("19614409", "Q-Interline A/S",                                 "QINTER",   "Nasdaq First North"),
    ("37536814", "Ringkjøbing Landbobank A/S",                      "RILBA",    ""),
    ("54879415", "Rockwool A/S",                                    "ROCK-B",   "ISIN DK0063855168 = B shares"),
    ("34411913", "Scandinavian Investment Group A/S",               "SIG",      ""),
    ("36440414", "Investeringsselskabet af 3. november 2025 A/S",   "3NOV25",   "Formerly SKAKO A/S, renamed Apr 2026"),
    ("45801012", "Skjern Bank A/S",                                 "SKJE",     ""),
    ("42741116", "Swiss Properties Invest A/S",                     "SWISS",    "Nasdaq First North"),
    ("37291269", "TCM Group A/S",                                   "TCM",      ""),
]


class Command(BaseCommand):
    help = "Fix InsiderIssuer names and symbols for companies not in the Stock table"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would change without saving",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        updated = 0
        not_found = []

        for cvr, name, symbol, notes in CORRECTIONS:
            try:
                issuer = InsiderIssuer.objects.get(cvr=cvr)
            except InsiderIssuer.DoesNotExist:
                not_found.append(f"  CVR {cvr} ({name}) — not in DB, skipping")
                continue

            changes = []
            if issuer.name != name:
                changes.append(f"name: {issuer.name!r} -> {name!r}")
            if symbol and issuer.symbol != symbol:
                changes.append(f"symbol: {issuer.symbol!r} -> {symbol!r}")

            if changes:
                self.stdout.write(f"{name} ({cvr}): {', '.join(changes)}")
                if notes:
                    self.stdout.write(f"  Note: {notes}")
                if not dry_run:
                    issuer.name = name
                    if symbol:
                        issuer.symbol = symbol
                    issuer.save(update_fields=["name", "symbol"])
                    cache.delete(f"insider_issuer_{cvr}")
                    updated += 1
            else:
                self.stdout.write(self.style.SUCCESS(f"{name} ({cvr}): already correct"))

        if not_found:
            self.stdout.write("\nNot found in DB:")
            for msg in not_found:
                self.stdout.write(msg)

        cache.delete("insider_issuers_list")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry run — no changes saved."))
        else:
            self.stdout.write(self.style.SUCCESS(f"\nDone. Updated {updated} issuers."))
