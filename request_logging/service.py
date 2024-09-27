import json
import re
from collections import OrderedDict
from datetime import timedelta, datetime

from django.db import transaction, IntegrityError
from django.utils import timezone

from request_logging.models import VisitorLock, RequestLog, Visitor
from shorts.models import Stock

device_pattern = re.compile(r'/shorts/(web|iphone|ipad|iwatch)')
action_pattern = re.compile(r'/(watch|pick)')
code_pattern = re.compile(r'/details/(\w+)', re.IGNORECASE)
version_pattern = re.compile(r'/(v\d+)')
referer_pattern = re.compile(r'(google|facebook|proinvestor)')


def delete_old_logs():
    two_months_ago = datetime.now() - timedelta(days=40)
    pks = list(RequestLog.objects.filter(timestamp__lt=two_months_ago).values_list('pk', flat=True))[:5000]
    RequestLog.objects.filter(pk__in=pks).delete()

    pks = list(RequestLog.objects.filter(requested_url__iendswith='/status-check').values_list('pk', flat=True))[:5000]
    RequestLog.objects.filter(pk__in=pks).delete()

    pks = list(RequestLog.objects.filter(requested_url__icontains='.php').values_list('pk', flat=True))[:5000]
    RequestLog.objects.filter(pk__in=pks).delete()


def process_visits():
    with transaction.atomic():
        try:
            VisitorLock.objects.create()
        except IntegrityError:
            return

    try:
        queryset = RequestLog.objects.filter(processed=False).order_by('timestamp')[:15000]
        today = timezone.now().date()

        for request_log in queryset:
            device_match = device_pattern.search(request_log.requested_url)
            action_match = action_pattern.search(request_log.requested_url)
            code_match = code_pattern.search(request_log.requested_url)
            version_match = version_pattern.search(request_log.requested_url)
            referer_match = referer_pattern.search(request_log.referer)

            device = device_match.group(1) if device_match else None
            action = action_match.group(1) if action_match else None
            try:
                code = Stock.objects.get(code=code_match.group(1)).symbol if code_match else None
            except Stock.DoesNotExist:
                continue
            version = version_match.group(1) if version_match else None
            referer = referer_match.group(1) if referer_match else None

            visitor, created = Visitor.objects.get_or_create(
                client_ip=request_log.client_ip,
                defaults={
                    'first': request_log.timestamp,
                    'previous': request_log.timestamp,
                    'last': request_log.timestamp,
                    'visits': 1,
                    'visits_today': 1 if request_log.timestamp.date() == today else 0,
                    'watch': json.dumps({code: 1}) if action == 'watch' and code else '{}',
                    'pick': json.dumps({code: 1}) if action == 'pick' and code else '{}',
                    'web': request_log.timestamp if device == 'web' else None,
                    'visits_web': 1 if device == 'web' else 0,
                    'iphone': request_log.timestamp if device == 'iphone' else None,
                    'visits_iphone': 1 if device == 'iphone' else 0,
                    'ipad': request_log.timestamp if device == 'ipad' else None,
                    'visits_ipad': 1 if device == 'ipad' else 0,
                    'iwatch': request_log.timestamp if device == 'iwatch' else None,
                    'visits_iwatch': 1 if device == 'iwatch' else 0,
                    'version': version,
                    'referer': json.dumps({referer: 1}) if referer else '{}'
                }
            )

            if not created:
                visitor.visits_today = visitor.visits_today + 1 if request_log.timestamp.date() == today else 0
                if visitor.last - visitor.previous > timedelta(hours=1):
                    visitor.previous = visitor.last
                visitor.last = request_log.timestamp
                visitor.visits += 1

                if action == 'watch' and code:
                    visitor.watch = update_json_count(visitor.watch, code)
                if action == 'pick' and code:
                    visitor.pick= update_json_count(visitor.pick, code)

                visitor.web = request_log.timestamp if device == 'web' else visitor.web
                visitor.visits_web = visitor.visits_web + 1 if device == 'web' else visitor.visits_web
                visitor.iphone = request_log.timestamp if device == 'iphone' else visitor.iphone
                visitor.visits_iphone = visitor.visits_iphone + 1 if device == 'iphone' else visitor.visits_iphone
                visitor.ipad = request_log.timestamp if device == 'ipad' else visitor.ipad
                visitor.visits_ipad = visitor.visits_ipad + 1 if device == 'ipad' else visitor.visits_ipad
                visitor.iwatch = request_log.timestamp if device == 'iwatch' else visitor.iwatch
                visitor.visits_iwatch = visitor.visits_iwatch + 1 if device == 'iwatch' else visitor.visits_iwatch
                visitor.version = version
                if referer and referer:
                    visitor.referer = update_json_count(visitor.referer, referer)

            visitor.save()
            request_log.processed = True
            request_log.save()

        VisitorLock.objects.all().delete()
    finally:
        VisitorLock.objects.all().delete()


def update_json_count(field, code):
    field_dict = json.loads(field)
    field_dict[code] = field_dict.get(code, 0) + 1

    sorted_field_dict = OrderedDict(sorted(field_dict.items(), key=lambda item: item[1], reverse=True))

    return json.dumps(sorted_field_dict)
