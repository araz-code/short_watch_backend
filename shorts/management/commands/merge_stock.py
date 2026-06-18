from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from shorts.models import (Stock, ShortPosition, ShortPositionChart,
                           LargeShortSelling, Announcement, CompanyMap)


class Command(BaseCommand):
    help = (
        "Merge one stock into another, e.g. after an ISIN (code) change. "
        "Moves all related data from --from onto --to and deletes the source "
        "stock. Because code is the primary key it cannot be renamed in place; "
        "this consolidates the two rows instead.\n\n"
        "By default the SOURCE chart is kept (it carries the real short-%% "
        "history) and the target's chart rows are discarded. Pass "
        "--keep-target-chart to invert that."
    )

    def add_arguments(self, parser):
        parser.add_argument('--from', dest='source_code', required=True,
                            help='code (ISIN) of the stock to merge FROM and delete')
        parser.add_argument('--to', dest='target_code', required=True,
                            help='code (ISIN) the data should end up under')
        parser.add_argument('--keep-target-chart', action='store_true',
                            help='keep the target chart instead of the source chart')
        parser.add_argument('--dry-run', action='store_true',
                            help='roll back at the end; only report what would change')

    def handle(self, *args, **opts):
        source_code = opts['source_code']
        target_code = opts['target_code']

        if source_code == target_code:
            raise CommandError('--from and --to must differ')

        try:
            source = Stock.objects.get(code=source_code)
        except Stock.DoesNotExist:
            raise CommandError(f'source stock {source_code} does not exist')

        target, created = Stock.objects.get_or_create(
            code=target_code,
            defaults={
                'name': source.name,
                'symbol': source.symbol,
                'active': source.active,
                'shares_outstanding': source.shares_outstanding,
                'float_shares': source.float_shares,
                'show_price_data': source.show_price_data,
            },
        )
        if created:
            self.stdout.write(f'Created target stock {target_code} from source defaults.')

        keep_source_chart = not opts['keep_target_chart']

        related = {
            'ShortPosition': ShortPosition.objects.filter(stock=source),
            'LargeShortSelling': LargeShortSelling.objects.filter(stock=source),
            'Announcement': Announcement.objects.filter(stock=source),
            'CompanyMap': CompanyMap.objects.filter(stock=source),
        }
        self.stdout.write(f'Merging {source_code} -> {target_code}')
        for label, qs in related.items():
            self.stdout.write(f'  {label}: {qs.count()} row(s) repointed')
        self.stdout.write(
            f'  Chart: keeping {"source" if keep_source_chart else "target"} '
            f'chart, dropping the other'
        )

        with transaction.atomic():
            if keep_source_chart:
                ShortPositionChart.objects.filter(stock=target).delete()
                ShortPositionChart.objects.filter(stock=source).update(stock=target)
            else:
                ShortPositionChart.objects.filter(stock=source).delete()

            for qs in related.values():
                qs.update(stock=target)

            source.delete()

            if opts['dry_run']:
                self.stdout.write(self.style.WARNING('Dry run: rolling back.'))
                transaction.set_rollback(True)
                return

        self.stdout.write(self.style.SUCCESS(
            f'Done. {source_code} merged into {target_code} and deleted.'
        ))
