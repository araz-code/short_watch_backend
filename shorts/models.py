from django.db import models


class ShortedStock(models.Model):
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=50)
    value = models.FloatField()
    timestamp = models.DateTimeField()

    def __str__(self):
        return f'{self.code} - {self.name}'


class RunStatus(models.Model):
    executed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.executed_at}'

    class Meta:
        verbose_name = 'run status'
        verbose_name_plural = 'run status'


class SymbolMap(models.Model):
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=20)

    def __str__(self):
        return f'{self.symbol} - {self.name}'


class ShortSeller(models.Model):
    name = models.CharField(max_length=50)
    business_id = models.CharField(max_length=20)
    stock_code = models.CharField(max_length=20)
    stock_name = models.CharField(max_length=50)
    value = models.FloatField()
    date = models.DateField()


class ShortedStockChart(models.Model):
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=50)
    value = models.FloatField()
    date = models.DateField()
