import requests
from django.core.cache import cache
from django.db.models import Count, Max, Min
from django.http import HttpResponse, Http404
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework_api_key.permissions import HasAPIKey

from insider_transactions.models import InsiderIssuer, InsiderTransaction
from insider_transactions.serializers import InsiderIssuerListSerializer, InsiderIssuerDetailSerializer

CACHE_TIMEOUT_SECONDS = 20 * 60


class InsiderIssuerView(ReadOnlyModelViewSet):
    permission_classes = [HasAPIKey]
    queryset = InsiderIssuer.objects.filter(active=True)
    lookup_field = "cvr"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return InsiderIssuerDetailSerializer
        return InsiderIssuerListSerializer

    def list(self, request, *args, **kwargs):
        cache_key = "insider_issuers_list"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        qs = (
            InsiderIssuer.objects.filter(active=True)
            .annotate(
                transaction_count=Count("transactions"),
                latest_date=Max("transactions__published_date"),
                earliest_date=Min("transactions__published_date"),
            )
            .filter(transaction_count__gt=0)
            .order_by("-latest_date", "name")
        )

        serializer = InsiderIssuerListSerializer(qs, many=True)
        data = serializer.data
        cache.set(cache_key, data, CACHE_TIMEOUT_SECONDS)
        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        cvr = kwargs.get("cvr")
        cache_key = f"insider_issuer_{cvr}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        instance = self.get_object()
        serializer = InsiderIssuerDetailSerializer(instance)
        data = serializer.data
        cache.set(cache_key, data, CACHE_TIMEOUT_SECONDS)
        return Response(data)


@xframe_options_exempt
@api_view(["GET"])
@permission_classes([])
def pdf_proxy_view(request, transaction_id):
    try:
        tx = InsiderTransaction.objects.get(pk=transaction_id)
    except InsiderTransaction.DoesNotExist:
        raise Http404

    if not tx.source_url:
        raise Http404

    try:
        resp = requests.get(tx.source_url, timeout=30, stream=True)
        resp.raise_for_status()
    except Exception:
        raise Http404

    response = HttpResponse(resp.content, content_type="application/pdf")
    response["Content-Disposition"] = "inline"
    return response
