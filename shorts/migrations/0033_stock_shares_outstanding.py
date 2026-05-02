from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shorts', '0032_restructure_announcement_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='stock',
            name='shares_outstanding',
            field=models.PositiveBigIntegerField(blank=True, null=True),
        ),
    ]
