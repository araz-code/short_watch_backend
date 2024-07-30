import uuid

from django.db import models

from shorts.models import Stock


class AppUser(models.Model):
    user_id = models.UUIDField(default=uuid.uuid4)
    fcm_token = models.TextField(null=True, blank=True)
    device = models.CharField(max_length=6)
    notification_active = models.BooleanField(null=True, blank=True)
    date_added = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    invalid = models.DateTimeField(null=True, blank=True)
    version = models.CharField(max_length=6)
    notifications_sent = models.IntegerField(default=0)
    stocks = models.ManyToManyField(Stock, related_name='app_users', blank=True)