"""Read-only profiler for the fetch_shorts cache-warm step.

Run on PythonAnywhere (where the DB has real data volume):

    python manage.py profile_cache_warms

Reports CPU time, wall time, and SQL query count for each warm function so
we can see which one actually dominates, instead of guessing. It calls the
same warm functions fetch_shorts does (they cache.set their results, exactly
like a real run), so running it once is harmless.
"""
import time

from django.core.management.base import BaseCommand
from django.db import connection
from django.test.utils import CaptureQueriesContext

from shorts.models import Stock, ShortSeller, Announcement, LargeShortSelling


class Command(BaseCommand):
    help = "Profile each fetch_shorts cache-warm function (CPU, wall, query count)."

    def handle(self, *args, **options):
        from shorts.views import (
            warm_top_lists_cache,
            warm_homepage_stats_cache,
            warm_short_positions_list_cache,
            warm_short_position_details_cache,
            warm_short_sellers_list_cache,
            warm_short_seller_details_cache,
        )

        # Context for interpreting the numbers.
        self.stdout.write("Data volume:")
        self.stdout.write(f"  active stocks : {Stock.objects.filter(active=True).count()}")
        self.stdout.write(f"  all stocks    : {Stock.objects.count()}")
        self.stdout.write(f"  short sellers : {ShortSeller.objects.count()}")
        self.stdout.write(f"  announcements : {Announcement.objects.count()}")
        self.stdout.write(f"  large sellings: {LargeShortSelling.objects.count()}")
        self.stdout.write("")

        warms = [
            warm_top_lists_cache,
            warm_homepage_stats_cache,
            warm_short_positions_list_cache,
            warm_short_position_details_cache,
            warm_short_sellers_list_cache,
            warm_short_seller_details_cache,
        ]

        header = f"{'warm':<38}{'cpu_s':>9}{'wall_s':>9}{'queries':>9}"
        self.stdout.write(header)
        self.stdout.write("-" * len(header))

        total_cpu = total_wall = total_q = 0.0
        rows = []
        for warm in warms:
            with CaptureQueriesContext(connection) as ctx:
                cpu0 = time.process_time()
                wall0 = time.perf_counter()
                warm()
                cpu = time.process_time() - cpu0
                wall = time.perf_counter() - wall0
            q = len(ctx)
            total_cpu += cpu
            total_wall += wall
            total_q += q
            rows.append((warm.__name__, cpu, wall, q))
            self.stdout.write(f"{warm.__name__:<38}{cpu:>9.3f}{wall:>9.3f}{q:>9d}")

        self.stdout.write("-" * len(header))
        self.stdout.write(f"{'TOTAL':<38}{total_cpu:>9.3f}{total_wall:>9.3f}{int(total_q):>9d}")
        self.stdout.write("")

        worst = max(rows, key=lambda r: r[1])
        self.stdout.write(f"Most CPU: {worst[0]} ({worst[1]:.3f}s, {worst[3]} queries)")
