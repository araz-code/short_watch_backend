from datetime import datetime, timedelta

import pytz
from django.core.management.base import BaseCommand, CommandError
import time

from django.db import transaction
from django.db.models import Max, F
from django.utils import timezone
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.select import Select

from errors.models import Error
from shorts.models import ShortedStock, RunStatus, ShortSeller, ShortedStockChart

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')


class Command(BaseCommand):
    help = "add data to the chart model"

    def handle(self, *args, **options):
        today = timezone.now()
        print(today)

        # Generate the last 7 days, including today
        last_seven_days = [today - timedelta(days=i) for i in range(9)]
        last_seven_days.reverse()

        unique_codes = ShortedStock.objects.values('code').distinct()
        code_list = [entry['code'] for entry in unique_codes]

        for code in code_list:
            for day_with_time in last_seven_days:
                timestamp = day_with_time.replace(hour=22, minute=30, second=0)

                day = timestamp.date()
                short = self.get_closest_value_to_date(day, code)

                ShortedStockChart.objects.update_or_create(
                    code=short.code,
                    date=day,
                    defaults={
                        'value': short.value,
                        'name': short.name,
                        'timestamp': timestamp
                    }
                )

    def get_closest_value_to_date(self, target_date, code):
        # Set the target date to midnight to get records for the entire day
        target_date_midnight = timezone.make_aware(datetime.combine(target_date, datetime.min.time()))

        # Query the database to get the most recent record on the target date
        closest_record = ShortedStock.objects.filter(code=code,
            timestamp__date=target_date_midnight.date()
        ).order_by('-timestamp').first()

        # If there are no records on the target date, find the most recent date before the target date
        if closest_record is None:
            closest_record = ShortedStock.objects.filter(code=code,
                timestamp__date__lt=target_date_midnight.date()
            ).order_by('-timestamp').first()

        return closest_record if closest_record else None



