from django.urls import path
from .views import PrivacyPolicyView, IndexView, TermsOfAgreementView

urlpatterns = [
    path('', IndexView.as_view(), name='root'),
    path('privacy-policy', PrivacyPolicyView.as_view(), name='privacy_policy'),
    path('terms-of-agreement', TermsOfAgreementView.as_view(), name='terms_of_agreement')
]