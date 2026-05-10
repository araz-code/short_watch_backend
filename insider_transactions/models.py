from django.db import models


class ProcessedAnnouncement(models.Model):
    announcement_id = models.CharField(max_length=100, unique=True)
    processed_at = models.DateTimeField(auto_now_add=True)
    skip_reason = models.CharField(max_length=500, blank=True, default="")

    def __str__(self):
        return self.announcement_id


class InsiderIssuer(models.Model):
    cvr = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=255)
    lei = models.CharField(max_length=20, blank=True, default="")
    symbol = models.CharField(max_length=20, blank=True, default="")
    active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.cvr})"


class InsiderTransaction(models.Model):
    issuer = models.ForeignKey(
        InsiderIssuer, on_delete=models.CASCADE, related_name="transactions"
    )
    announcement_id = models.CharField(max_length=100, db_index=True)
    published_date = models.DateField()

    # Person
    person_name = models.CharField(max_length=255)
    person_role = models.CharField(max_length=255, blank=True, default="")
    closely_associated_to = models.CharField(max_length=255, blank=True, default="")

    # Transaction details
    transaction_type = models.CharField(max_length=100, blank=True, default="")
    instrument_type = models.CharField(max_length=100, blank=True, default="")
    instrument_name = models.CharField(max_length=255, blank=True, default="")
    isin = models.CharField(max_length=20, blank=True, default="")
    transaction_date = models.DateField(null=True, blank=True)
    volume = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    currency = models.CharField(max_length=10, blank=True, default="")
    total_amount = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    venue = models.CharField(max_length=255, blank=True, default="")

    source_url = models.URLField(max_length=1000, blank=True, default="")
    extraction_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-published_date", "-created_at"]

    def __str__(self):
        return f"{self.issuer.name} - {self.person_name} - {self.transaction_date}"
