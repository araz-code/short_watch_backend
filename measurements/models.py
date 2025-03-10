from django.db import models


class Measurement(models.Model):
    user_id = models.UUIDField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    light_level = models.IntegerField()
    noise_level = models.FloatField()

    def __str__(self):
        return f"Temp: {self.temperature}°C, Humidity: {self.humidity}%"
