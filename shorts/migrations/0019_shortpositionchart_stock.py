# Generated by Django 4.1.3 on 2023-12-02 12:51

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shorts', '0018_auto_20231202_1348'),
    ]

    operations = [
        migrations.AddField(
            model_name='shortpositionchart',
            name='stock',
            field=models.ForeignKey(default='DK0061802139', on_delete=django.db.models.deletion.PROTECT, to='shorts.stock'),
            preserve_default=False,
        ),
    ]
