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
    close = models.FloatField(null=True)
    volume = models.PositiveBigIntegerField(null=True)
