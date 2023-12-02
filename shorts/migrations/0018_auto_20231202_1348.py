# Generated by Django 4.1.3 on 2023-12-02 12:48

from django.db import migrations


def populate_short_seller_code(apps, schema_editor):
    ShortSeller = apps.get_model('shorts', 'ShortSeller')
    Stock = apps.get_model('shorts', 'Stock')

    for short_seller in ShortSeller.objects.all():
        try:
            short_seller.stock = Stock.objects.get(code=short_seller.stock_code)
            short_seller.save()
        except Stock.DoesNotExist:
            print('Error')
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('shorts', '0017_shortseller_stock'),
    ]

    operations = [
        migrations.RunPython(populate_short_seller_code),
    ]