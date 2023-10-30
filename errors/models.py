from django.db import models


class Error(models.Model):
    message = models.CharField(max_length=500)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.message}'
