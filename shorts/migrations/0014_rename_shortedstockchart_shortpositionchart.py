# Generated by Django 4.1.3 on 2023-12-02 09:38

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('shorts', '0013_rename_shortedstock_shortposition'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='ShortedStockChart',
            new_name='ShortPositionChart',
        ),
    ]
