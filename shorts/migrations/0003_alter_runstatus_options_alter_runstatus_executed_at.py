# Generated by Django 4.1.3 on 2023-10-24 21:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shorts', '0002_runstatus'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='runstatus',
            options={'verbose_name': 'run status', 'verbose_name_plural': 'run status'},
        ),
        migrations.AlterField(
            model_name='runstatus',
            name='executed_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
