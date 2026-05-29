from django.views.generic import TemplateView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_api_key.permissions import HasAPIKey

from home_page.analyses_data import load_analyses

SITE = "https://www.zirium.dk"


@api_view(['GET'])
@permission_classes([HasAPIKey])
def analyses_view(request):
    """List analyses (in registry order, newest first), localized via ?lang=da|en.
    Reads the shared analyses.json, the same source the web and OG tags use."""
    lang = 'en' if request.GET.get('lang', 'da').startswith('en') else 'da'
    items = []
    for a in load_analyses().get("analyses", []):
        og_image = a.get("ogImage")
        items.append({
            "slug": a["slug"],
            "code": a.get("code", ""),
            "title": a["title"],
            "subtitle": a["subtitle"][lang],
            "excerpt": a["excerpt"][lang],
            "date": a["date"][lang],
            "readingMinutes": a["readingMinutes"],
            "url": f"{SITE}/analyse/{a['slug']}",
            "ogImage": (f"{SITE}/og-images/{og_image}{'-en' if lang == 'en' else ''}.png"
                        if og_image else None),
        })
    return Response(items)


class IndexView(TemplateView):
    template_name = "home_page/index.html"


class PrivacyPolicyView(TemplateView):
    template_name = "home_page/privacy_policy.html"


class TermsOfAgreementView(TemplateView):
    template_name = "home_page/terms_of_agreement.html"


class PrivatlivspolitikView(TemplateView):
    template_name = "home_page/privatlivspolitik.html"


class AftalevilkaarView(TemplateView):
    template_name = "home_page/aftalevilkaar.html"
