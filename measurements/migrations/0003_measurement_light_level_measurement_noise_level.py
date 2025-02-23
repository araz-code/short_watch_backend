# Generated by Django 4.1.3 on 2025-02-23 15:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('measurements', '0002_measurement_user_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='measurement',
            name='light_level',
            field=models.PositiveIntegerField(default=0),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='measurement',
            name='noise_level',
            field=models.FloatField(default=0),
            preserve_default=False,
        ),
    ]
