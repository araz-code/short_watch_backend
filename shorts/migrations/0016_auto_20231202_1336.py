# Generated by Django 4.1.3 on 2023-12-02 12:36

from django.db import migrations


def populate_short_position_code(apps, schema_editor):
    ShortPosition = apps.get_model('shorts', 'ShortPosition')
    Stock = apps.get_model('shorts', 'Stock')

    for short_position in ShortPosition.objects.all():
        try:
            short_position.stock = Stock.objects.get(code=short_position.code)
            short_position.save()
        except Stock.DoesNotExist:
            print('Error')
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('shorts', '0015_shortposition_stock'),
    ]

    operations = [
        migrations.RunPython(populate_short_position_code),
    ]