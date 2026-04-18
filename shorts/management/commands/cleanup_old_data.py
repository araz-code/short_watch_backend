from datetime import date

from django.core.management.base import BaseCommand
from django.db.models import Q

from shorts.models import Announcement, CompanyMap, ShortSeller


class Command(BaseCommand):
    help = "Deletes announcements older than 2021 and cleans up unreferenced company maps and short sellers"

    def handle(self, *args, **options):
        # Delete announcements older than 2021
        cutoff = date(2021, 1, 1)
        old_announcements = Announcement.objects.filter(published_date__lt=cutoff)
        count = old_announcements.count()
        old_announcements.delete()
        self.stdout.write(f'Deleted {count} announcements older than {cutoff}')

        # Delete CompanyMap entries that have no stock assigned and are not handled
        orphaned_maps = CompanyMap.objects.filter(stock__isnull=True, handled=False)
        count = orphaned_maps.count()
        orphaned_maps.delete()
        self.stdout.write(f'Deleted {count} unhandled company maps with no stock')

        # Delete ShortSellers that have no announcements and no large_short_sellings
        orphaned_sellers = ShortSeller.objects.filter(
            announcements__isnull=True,
            large_short_sellings__isnull=True,
        )
        count = orphaned_sellers.count()
        orphaned_sellers.delete()
        self.stdout.write(f'Deleted {count} orphaned short sellers')

        self.stdout.write(self.style.SUCCESS('Cleanup complete'))
