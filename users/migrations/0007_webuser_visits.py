# Generated by Django 4.1.3 on 2024-08-15 05:18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_appuser_client_ip'),
    ]

    operations = [
        migrations.AddField(
            model_name='webuser',
            name='visits',
            field=models.PositiveBigIntegerField(default=1),
        ),
    ]
