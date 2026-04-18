import re
from datetime import datetime

import pytz

from errors.models import Error
from shorts.models import Stock, CompanyMap, ShortSeller

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')

# Matches all known headline formats:
# "Fosse Capital Partners LLP holds a net short position of 0,99% in the share capital issued by Netcompany Group A/S"
# "(Historical) Marshall Wace LLP holds a short position at 1.53 % in shares issued by Vestas Wind Systems A/S"
# "(Historical) CANCELLATION: Fosse Capital Partners LLP holds a net short position of 0,60% in ..."
HEADLINE_PATTERN = re.compile(
    r'^(?:\(Historical\)\s*)?(?:CANCELLATION:\s*)?'
    r'(.+?)\s+holds a (?:net )?short position (?:of|at)\s+'
    r'([\d]+[,.][\d]+)\s*%'
)


def parse_headline(headline):
    is_historic = headline.startswith('(Historical)')
    is_cancellation = 'CANCELLATION' in headline or 'CANCELLED' in headline

    match = HEADLINE_PATTERN.match(headline.strip())
    if not match:
        return None

    seller_name = match.group(1).strip()
    value_str = match.group(2).replace(',', '.')

    return {
        'seller_name': seller_name,
        'value': float(value_str),
        'is_historic': is_historic,
        'is_cancellation': is_cancellation,
    }


def parse_publication_date(date_str):
    dt = datetime.strptime(date_str, '%d-%m-%Y %H:%M:%S')
    return copenhagen_timezone.localize(dt)


def get_stock_for_issuer(issuer_name):
    try:
        return Stock.objects.get(name=issuer_name)
    except Stock.DoesNotExist:
        pass

    try:
        mapping = CompanyMap.objects.get(issuer_name=issuer_name, stock__isnull=False)
        return mapping.stock
    except CompanyMap.DoesNotExist:
        pass

    CompanyMap.objects.get_or_create(
        issuer_name=issuer_name,
        defaults={'announced_company_name': issuer_name}
    )
    Error.objects.create(message=f'New issuer needs mapping: {issuer_name}'[:500])
    return None


def get_or_create_seller(name):
    try:
        return ShortSeller.objects.get(name=name)
    except ShortSeller.DoesNotExist:
        seller = ShortSeller.objects.create(name=name)
        Error.objects.create(message=f'A new short seller was created: {name}'[:500])
        return seller
