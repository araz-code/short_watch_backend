# Generated by Django 4.1.3 on 2023-12-02 12:30

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shorts', '0014_rename_shortedstockchart_shortpositionchart'),
    ]

    operations = [
        migrations.AddField(
            model_name='shortposition',
            name='stock',
            field=models.ForeignKey(default='DK0061802139', on_delete=django.db.models.deletion.PROTECT, to='shorts.stock'),
            preserve_default=False,
        ),
    ]
