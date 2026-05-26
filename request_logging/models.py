from django.db import models


class RequestLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    client_ip = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=255)
    requested_url = models.TextField()
    referer = models.CharField(max_length=255)
    processed = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.timestamp} - {self.requested_url}'


class ContactSubmission(models.Model):
    CATEGORY_CHOICES = [
        ('bug', 'Bug rapport'),
        ('feedback', 'Feedback'),
        ('idea', 'Idé'),
        ('analysis', 'Analyse'),
        ('other', 'Andet'),
    ]
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    message = models.TextField()
    email = models.EmailField(blank=True, default='')
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default='')
    read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        sender = self.email or '(anonymous)'
        return f'{self.created_at:%Y-%m-%d %H:%M} - {self.get_category_display()} - {sender}'


class PageFeedback(models.Model):
    SENTIMENT_CHOICES = [
        ('positive', '👍 Positive'),
        ('negative', '👎 Negative'),
    ]
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    sentiment = models.CharField(max_length=10, choices=SENTIMENT_CHOICES, db_index=True)
    page_type = models.CharField(max_length=50, db_index=True)  # e.g. 'analysis'
    page_id = models.CharField(max_length=200, db_index=True)   # e.g. analysis slug
    comment = models.TextField(blank=True, default='')
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default='')
    read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} - {self.sentiment} - {self.page_type}/{self.page_id}'
