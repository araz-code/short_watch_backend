from django.urls import path
from .views import PrivacyPolicyView, IndexView, TermsOfAgreementView, PrivatlivspolitikView, AftalevilkaarView

urlpatterns = [
    path('', IndexView.as_view(), name='root'),
    path('privacy-policy', PrivacyPolicyView.as_view(), name='privacy_policy'),
    path('terms-of-agreement', TermsOfAgreementView.as_view(), name='terms_of_agreement'),
    path('privatlivspolitik', PrivatlivspolitikView.as_view(), name='privatlivspolitik'),
    path('aftalevilkaar', AftalevilkaarView.as_view(), name='aftalevilkaar'),
]