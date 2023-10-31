from django.views.generic import TemplateView


class IndexView(TemplateView):
    template_name = "home_page/index.html"


class PrivacyPolicyView(TemplateView):
    template_name = "home_page/privacy_policy.html"


class TermsOfAgreementView(TemplateView):
    template_name = "home_page/terms_of_agreement.html"
