import pytz
from django.core.management.base import BaseCommand, CommandError
import requests
import re


from django.utils.dateparse import parse_datetime


from errors.models import Error
from short_watch_backend.settings import ANNOUNCEMENT_API_KEY, FCM_SERVICE_ACCOUNT_FILE
from shorts.models import Announcement, Stock, CompanyMap, ShortSeller

import firebase_admin
from firebase_admin import credentials

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')

cred = credentials.Certificate(FCM_SERVICE_ACCOUNT_FILE)
firebase_admin.initialize_app(cred)


class Command(BaseCommand):
    help = "Fetches announcements data"

    ANNOUNCEMENTS_SITE_URL = 'https://ft-api.prod.oam.finanstilsynet.dk/external/v0.1/trigger/dfsa-search-announcement'

    ANNOUNCEMENTS_HEADERS = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ANNOUNCEMENT_API_KEY}'
    }

    PATTERN = r"(\d+\.\d+)%"

    def handle(self, *args, **options):
        self.fetch_announcements()

    def fetch_announcements(self):

        for skip in range(76, 84):
            body = {
                'SortField': 'RegistrationDate',
                'Ascending': False,
                'Skip': skip*100,
                'Take': 100,
                'Status': [
                    'Not Published'
                ],
                'IncludeHistoric': True
            }
            try:
                response = requests.post(self.ANNOUNCEMENTS_SITE_URL, json=body,
                                         headers=self.ANNOUNCEMENTS_HEADERS)

                if response.status_code == 200:
                    announcements = response.json()['data']
                    for item in announcements:
                        stock = self.get_stock_for_announcement(item.get('IssuerName'),
                                                                item.get('AnnouncedCompanyName'))

                        if not stock:
                            continue

                        value = None
                        seller = None
                        if item.get('Type') == 'Shortselling':
                            match = re.search(self.PATTERN, item.get("Headline"))

                            if match:
                                value = match.group(1)

                            if item.get("AnnouncedCompanyName"):
                                seller = self.get_seller_for_announcement(item.get("AnnouncedCompanyName"))

                        try:
                            _ = Announcement.objects.update_or_create(
                                stock=stock,
                                announcement_number=item["AnnouncementNumber"],
                                issuer_name=item["IssuerName"],
                                defaults={
                                    "announced_company_name": item.get("AnnouncedCompanyName"),
                                    "cvr_company_name": item.get("CVRCompanyName"),
                                    "headline": item.get("Headline"),
                                    "headline_danish": item.get("HeadlineDanish"),
                                    "shortselling_type": item.get("ShortsellingType"),
                                    "status": item.get("Status"),
                                    "type": item.get("Type"),
                                    "notification_datetime_to_company": parse_datetime(
                                        item.get("NotificationDateTimeToCompany"))
                                    if item.get("NotificationDateTimeToCompany") else None,
                                    "publication_date": parse_datetime(item.get("PublicationDate"))
                                    if item.get("PublicationDate") else None,
                                    "published_date": parse_datetime(item.get("PublishedDate")),
                                    "registration_date": parse_datetime(item.get("RegistrationDate")),
                                    "registration_datetime": parse_datetime(item.get("RegistrationDateTime")),
                                    "is_historic": item.get("IsHistoric", False),
                                    "shortselling_country": item.get("ShortsellingCountry"),
                                    "shortselling_country_danish": item.get("ShortsellingCountryDanish"),
                                    "dfsa_id": item.get("Id", ""),
                                    "value": value,
                                    "short_seller": seller
                                }
                            )
                        except Exception as e:
                            continue
                            # Error.objects.create(message=f"Could not create announcement: {str(item)[:450]}]")
                else:
                    Error.objects.create(message=f"Failed to fetch announcements. Status code: {response.status_code}")
                    raise CommandError(f'Error occurred')

            except Exception as e:
                Error.objects.create(message=str(e)[:500])
                raise CommandError(f'Error occurred: {str(e)}')

    @staticmethod
    def get_stock_for_announcement(issuer_name, announced_company_name):
        stock_name = issuer_name if issuer_name else announced_company_name

        try:
            return Stock.objects.get(name=stock_name)
        except Stock.DoesNotExist:
            try:
                if issuer_name:
                    return CompanyMap.objects.get(issuer_name=issuer_name).stock
                elif announced_company_name:
                    return CompanyMap.objects.get(announced_company_name=announced_company_name).stock
                else:
                    return None
            except CompanyMap.DoesNotExist:
                company = CompanyMap.objects.create(announced_company_name=announced_company_name,
                                          issuer_name=issuer_name)

                Error.objects.create(message=f'A new company was created and needs to be handled: {stock_name}')

                return company

    @staticmethod
    def get_seller_for_announcement(announced_company_name):
        try:
            return ShortSeller.objects.get(name=announced_company_name)
        except ShortSeller.DoesNotExist:
            short_seller = ShortSeller.objects.create(name=announced_company_name)

            Error.objects.create(message=f'A new short seller was created: {announced_company_name}')

            return short_seller
