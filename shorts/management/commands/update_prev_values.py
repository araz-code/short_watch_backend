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
from shorts.models import ShortPosition, RunStatus, LargeShortSelling, ShortPositionChart, Stock

copenhagen_timezone = pytz.timezone('Europe/Copenhagen')


class Command(BaseCommand):
    help = "update prev value for short position"

    def handle(self, *args, **options):

        stocks = Stock.objects.all()

        for stock in stocks:
            short_positions = ShortPosition.objects.filter(stock=stock).order_by('timestamp')

            prev_value = 0
            for short_position in short_positions:
                short_position.prev_value = prev_value
                prev_value = short_position.value
                short_position.save()





