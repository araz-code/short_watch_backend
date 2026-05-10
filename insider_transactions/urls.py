from django.urls import path, include
from rest_framework import routers

from insider_transactions.views import InsiderIssuerView, pdf_proxy_view

router = routers.DefaultRouter(trailing_slash=False)
router.register("issuers", InsiderIssuerView, basename="insider-issuers")

urlpatterns = [
    path("pdf/<int:transaction_id>", pdf_proxy_view, name="insider-pdf"),
    path("", include(router.urls)),
]
