# Generated by Django 4.1.3 on 2023-11-01 21:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('request_logging', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='requestlog',
            name='referer',
            field=models.CharField(default='', max_length=255),
            preserve_default=False,
        ),
    ]
