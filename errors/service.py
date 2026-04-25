from datetime import timedelta

from django.utils import timezone

from errors.models import Error


def delete_old_errors():
    """Prune Error rows older than 10 days, capped at 20,000 deletions per
    run to keep the DELETE bounded.
    """
    cutoff = timezone.now() - timedelta(days=10)
    pks = list(Error.objects.filter(date__lt=cutoff).values_list('pk', flat=True))[:20000]
    Error.objects.filter(pk__in=pks).delete()
