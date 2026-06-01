"""Backfill PageFeedback.client_ip for historical rows that were saved before the
feedback view captured the IP.

The feedback POST (/stats/feedback/) is not itself logged in RequestLog (the
middleware skips /stats/), so we infer the IP from the page view that preceded
the feedback: a RequestLog entry whose URL contains the feedback's page_id
(e.g. the analysis slug), shortly before created_at, ideally with the same
user-agent.

Precision-oriented matching (per feedback row with a null client_ip):
  1. Look at RequestLog entries in [created_at - window, created_at] whose
     requested_url contains the page_id.
  2. If the feedback row has a user_agent, also require it to match. A single
     matching user-agent on the same page in a tight window is a strong signal,
     so we take the closest entry in time.
  3. Without a user_agent we only assign when every candidate shares one IP
     (unambiguous); otherwise the row is left untouched and reported.

Dry-run by default. Pass --apply to write.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from request_logging.models import PageFeedback, RequestLog


class Command(BaseCommand):
    help = "Backfill PageFeedback.client_ip from RequestLog for rows missing an IP."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist the inferred IPs. Without this flag the command only reports (dry run).",
        )
        parser.add_argument(
            "--window-hours",
            type=float,
            default=3.0,
            help="How long before created_at to look for the matching page view (default: 3).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        window = timedelta(hours=options["window_hours"])

        rows = list(PageFeedback.objects.filter(client_ip__isnull=True).order_by("created_at"))
        if not rows:
            self.stdout.write(self.style.SUCCESS("No PageFeedback rows are missing an IP. Nothing to do."))
            return

        self.stdout.write(
            f"{len(rows)} feedback row(s) missing client_ip. "
            f"Window: {options['window_hours']}h. Mode: {'APPLY' if apply else 'DRY RUN'}.\n"
        )

        assigned_ua = 0       # matched on page_id + user_agent (strong)
        assigned_unique = 0   # no user_agent, but a single unambiguous IP
        skipped_ambiguous = 0 # multiple distinct IPs, no user_agent to disambiguate
        no_candidates = 0     # no matching page view found

        updates = []  # (feedback, ip, basis)

        for fb in rows:
            if not fb.page_id:
                no_candidates += 1
                continue

            window_start = fb.created_at - window
            base_qs = RequestLog.objects.filter(
                timestamp__gte=window_start,
                timestamp__lte=fb.created_at,
                requested_url__icontains=fb.page_id,
            )

            ip = None
            basis = None

            if fb.user_agent:
                ua_candidates = list(
                    base_qs.filter(user_agent=fb.user_agent).order_by("-timestamp")[:1]
                )
                if ua_candidates:
                    ip = ua_candidates[0].client_ip
                    basis = "page_id+user_agent"

            if ip is None:
                distinct_ips = list(
                    base_qs.values_list("client_ip", flat=True).distinct()
                )
                if len(distinct_ips) == 1:
                    ip = distinct_ips[0]
                    basis = "page_id (unique IP)"
                elif len(distinct_ips) > 1:
                    skipped_ambiguous += 1
                    self.stdout.write(
                        f"  ambiguous  id={fb.id} {fb.page_id} @ {fb.created_at:%Y-%m-%d %H:%M} "
                        f"-> {len(distinct_ips)} distinct IPs, skipped"
                    )
                    continue
                else:
                    no_candidates += 1
                    continue

            if ip is None:
                no_candidates += 1
                continue

            if basis == "page_id+user_agent":
                assigned_ua += 1
            else:
                assigned_unique += 1

            updates.append((fb, ip, basis))
            self.stdout.write(
                f"  match      id={fb.id} {fb.page_id} @ {fb.created_at:%Y-%m-%d %H:%M} "
                f"-> {ip}  ({basis})"
            )

        if apply and updates:
            with transaction.atomic():
                for fb, ip, _ in updates:
                    fb.client_ip = ip
                    fb.save(update_fields=["client_ip"])

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Summary:"))
        self.stdout.write(f"  matched (page_id + user_agent): {assigned_ua}")
        self.stdout.write(f"  matched (unique IP, no UA):      {assigned_unique}")
        self.stdout.write(f"  skipped (ambiguous):             {skipped_ambiguous}")
        self.stdout.write(f"  no matching page view:           {no_candidates}")
        total_matched = assigned_ua + assigned_unique
        if apply:
            self.stdout.write(self.style.SUCCESS(f"  written to DB:                   {total_matched}"))
        else:
            self.stdout.write(
                self.style.WARNING(f"  would write (re-run with --apply): {total_matched}")
            )
