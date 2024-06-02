from django.db import models


class RequestLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    client_ip = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=255)
    requested_url = models.TextField()
    referer = models.CharField(max_length=255)
    processed = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.timestamp} - {self.requested_url}'


class Visitor(models.Model):
    client_ip = models.GenericIPAddressField()
    first = models.DateTimeField()
    previous = models.DateTimeField(null=True)
    last = models.DateTimeField()
    visits = models.PositiveBigIntegerField()
    visits_today = models.PositiveBigIntegerField()
    watch = models.TextField(blank=True)
    pick = models.TextField(blank=True)
    web = models.DateTimeField(null=True)
    visits_web = models.PositiveBigIntegerField(default=0)
    iphone = models.DateTimeField(null=True)
    visits_iphone = models.PositiveBigIntegerField(default=0)
    ipad = models.DateTimeField(null=True)
    visits_ipad = models.PositiveBigIntegerField(default=0)
    iwatch = models.DateTimeField(null=True)
    visits_iwatch = models.PositiveBigIntegerField(default=0)
    version = models.CharField(max_length=5, null=True)
    referer = models.TextField(blank=True)


class VisitorLock(models.Model):
    singleton_enforcer = models.CharField(max_length=1, unique=True, default='X')
    created_at = models.DateTimeField(auto_now_add=True)
