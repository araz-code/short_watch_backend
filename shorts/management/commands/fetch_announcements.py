import requests
from django.core.management.base import BaseCommand, CommandError

from errors.models import Error
from shorts.models import Announcement
from shorts.utils import parse_headline, parse_publication_date, get_stock_for_issuer, get_or_create_seller

SEARCH_URL = 'https://appft.gold.extension.gopublic.dk/api/9217fa13-5d9a-46c6-9921-69ee7e6cfaf6/search'

HEADERS = {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://appft.gold.extension.gopublic.dk',
    'referer': 'https://appft.gold.extension.gopublic.dk/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
}


class Command(BaseCommand):
    help = "Fetches short selling announcements from Finanstilsynet"

    def add_arguments(self, parser):
        parser.add_argument('--backfill', action='store_true',
                            help='Wipe existing announcements and backfill all historical data')

    def handle(self, *args, **options):
        if options['backfill']:
            self.backfill()
        else:
            self.fetch_incremental()

    def fetch_incremental(self):
        """Fetch recent announcements (page 1 of historical endpoint)."""
        try:
            body = {
                'query': '',
                'filters': [
                    {'type': 'dropdown', 'key': 'CategoryFilter', 'options': ['ShortSelling']},
                    {'type': 'dropdown', 'key': 'HistoricalFilter', 'options': ['true']},
                ],
                'page': 1,
                'pageSize': 100,
            }
            response = requests.post(SEARCH_URL, json=body, headers=HEADERS)

            if response.status_code != 200:
                Error.objects.create(message=f'Failed to fetch announcements. Status: {response.status_code}')
                raise CommandError(f'API returned status {response.status_code}')

            rows = response.json()['data']['rows']
            new_count = 0
            for row in rows:
                created = self.process_row(row)
                if not created:
                    break
                new_count += 1

            self.stdout.write(f'Processed {new_count} new announcements')

        except CommandError:
            raise
        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')

    def backfill(self):
        """Wipe all announcements and re-import from historical endpoint."""
        Announcement.objects.all().delete()
        self.stdout.write('Wiped existing announcements')

        try:
            page = 1
            total_pages = 1
            total_created = 0

            while page <= total_pages:
                body = {
                    'query': '',
                    'filters': [
                        {'type': 'dropdown', 'key': 'CategoryFilter', 'options': ['ShortSelling']},
                        {'type': 'dropdown', 'key': 'HistoricalFilter', 'options': ['true']},
                    ],
                    'page': page,
                    'pageSize': 100,
                }
                response = requests.post(SEARCH_URL, json=body, headers=HEADERS)

                if response.status_code != 200:
                    Error.objects.create(message=f'Backfill failed at page {page}. Status: {response.status_code}')
                    raise CommandError(f'API returned status {response.status_code} at page {page}')

                data = response.json()
                total_pages = data['paging']['totalPages']
                rows = data['data']['rows']

                for row in rows:
                    self.process_row(row)
                    total_created += 1

                self.stdout.write(f'Page {page}/{total_pages} done ({total_created} records)')
                page += 1

            self.stdout.write(self.style.SUCCESS(f'Backfill complete: {total_created} announcements imported'))

        except CommandError:
            raise
        except Exception as e:
            Error.objects.create(message=str(e)[:500])
            raise CommandError(f'Error occurred: {str(e)}')

    @staticmethod
    def process_row(row):
        """Process a single API row. Returns True if created/updated, False if already exists."""
        dfsa_id = row['id']

        if Announcement.objects.filter(dfsa_id=dfsa_id).exists():
            return False

        headline = row['HeadlineColumn']
        issuer_name = row['IssuerColumn']

        parsed = parse_headline(headline)
        if not parsed:
            Error.objects.create(message=f'Could not parse headline: {headline[:450]}')
            return True

        stock = get_stock_for_issuer(issuer_name)
        if not stock:
            return True

        seller = get_or_create_seller(parsed['seller_name'])
        published_date = parse_publication_date(row['PublicationDateColumn'])
        registration_date = parse_publication_date(row['RegistrationDateColumn'])

        Announcement.objects.create(
            dfsa_id=dfsa_id,
            stock=stock,
            short_seller=seller,
            issuer_name=issuer_name,
            headline=headline,
            headline_danish='',
            type='Shortselling',
            value=parsed['value'],
            published_date=published_date,
            registration_date=registration_date,
            is_historic=parsed['is_historic'],
            is_cancellation=parsed['is_cancellation'],
        )
        return True
