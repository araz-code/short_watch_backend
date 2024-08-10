from django.db import models


class Stock(models.Model):
    code = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=20)

    def __str__(self):
        return f'{self.symbol} - {self.name}'


class ShortPosition(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT)
    # code = models.CharField(max_length=20)
    # name = models.CharField(max_length=50)
    value = models.FloatField()
    prev_value = models.FloatField(default=0)
    timestamp = models.DateTimeField()

    def __str__(self):
        return f'{self.stock.code} - {self.stock.name}'


class RunStatus(models.Model):
    executed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.executed_at}'

    class Meta:
        verbose_name = 'run status'
        verbose_name_plural = 'run status'


class ShortSeller(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT)
    name = models.CharField(max_length=50)
    business_id = models.CharField(max_length=20)
    # stock_code = models.CharField(max_length=20)
    # stock_name = models.CharField(max_length=50)
    value = models.FloatField()
    date = models.DateField()


class ShortPositionChart(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT)
    # code = models.CharField(max_length=20)
    # name = models.CharField(max_length=50)
    value = models.FloatField()
    date = models.DateField()
    timestamp = models.DateTimeField()


class Announcement(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT)
    announced_company_name = models.CharField(max_length=150)
    announcement_number = models.CharField(max_length=20)
    cvr_company_name = models.CharField(max_length=150, null=True, blank=True)
    headline = models.CharField(max_length=600)
    headline_danish = models.CharField(max_length=600)
    issuer_name = models.CharField(max_length=150, null=True, blank=True)
    shortselling_type = models.CharField(max_length=30, null=True, blank=True)
    status = models.CharField(max_length=30)
    type = models.CharField(max_length=30)
    notification_datetime_to_company = models.DateTimeField(null=True, blank=True)
    publication_date = models.DateTimeField(null=True, blank=True)
    published_date = models.DateTimeField()
    registration_date = models.DateTimeField()
    registration_datetime = models.DateTimeField()
    is_historic = models.BooleanField(null=True, blank=True)
    shortselling_country = models.CharField(max_length=70, null=True, blank=True)
    shortselling_country_danish = models.CharField(max_length=70, null=True, blank=True)
    dfsa_id = models.CharField(max_length=100)

    def __str__(self):
        return self.announcement_number


class CompanyMap(models.Model):
    announced_company_name = models.CharField(max_length=150)
    issuer_name = models.CharField(max_length=150, null=True, blank=True)
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT, null=True, blank=True)
    handled = models.BooleanField(default=False)
