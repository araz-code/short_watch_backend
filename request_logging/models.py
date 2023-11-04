from django.db import models


class RequestLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    client_ip = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=255)
    requested_url = models.TextField()
    referer = models.CharField(max_length=255)

    def __str__(self):
        return f'{self.timestamp} - {self.requested_url}'
