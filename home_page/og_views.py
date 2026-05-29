"""Server-side Open Graph injection for analysis pages.

The SPA is served as a single static dist/index.html for every route. Social
crawlers (Slack, Facebook, LinkedIn, X) do not execute JavaScript, so the
per-analysis OG tags that React sets client-side never reach them - they only
see the generic tags baked into index.html.

This view intercepts /analyse/... routes, reads the same dist/index.html, and
rewrites the OG/Twitter/title tags server-side based on a slug -> metadata map.
Real users still get the full SPA (the #root div and JS bundle are untouched);
crawlers get the correct per-analysis preview.
"""
import os
import re

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render

INDEX_PATH = os.path.join(settings.FRONTEND_DIR, "dist", "index.html")
SITE = "https://www.zirium.dk"
OG = f"{SITE}/og-images"

# Keyed by the normalised path (no leading/trailing slash). Both the dated and
# the short route for each analysis map to the same metadata. Mirrors the OG
# tags defined in the React analysis pages.
ANALYSIS_META = {
    "analyse": {
        "title": "Analyser af danske aktier",
        "description": "Dybdegående analyser af danske aktier: short-positioner, "
                       "værdiansættelser og markedsbevægelser fra Zirium.",
        "image": f"{OG}/analyse-index.png",
    },
    "analyse/gn/2026-05-14": {
        "title": "Shortanalyse: Shorterne holder fast trods Amplifon-salget",
        "description": "Dybdegående analyse af short-positioner i GN Store Nord (GN). "
                       "Shorterne holder fast trods Amplifon-salget.",
        "image": f"{OG}/gn-2026-05-14.png",
    },
    "analyse/bava/2026-05-17": {
        "title": "Shortanalyse: Da BAVA sad øverst på shortlisten",
        "description": "Analyse af short-positioner i Bavarian Nordic (BAVA). Fra 9,40% i "
                       "oktober 2023 til under 2% i dag, gennem et overtagelsesbud og et "
                       "kursfald på 54% fra toppen.",
        "image": f"{OG}/bava-2026-05-17.png",
    },
    "analyse/pandora/2026-05-23": {
        "title": "Pandora og sølvprisen: Hvordan råvarer og forbrugertillid påvirker aktien",
        "description": "Analyse af sammenhængen mellem sølvprisen, amerikansk forbrugertillid "
                       "og Pandora-aktiens kursudvikling. Fra ca. 940 DKK i januar 2024 til "
                       "556 DKK i maj 2026, mens sølvprisen mere end tredobledes.",
        "image": f"{OG}/pandora-2026-05-23.png",
    },
    "analyse/novo/dcf/2026-05-19": {
        "title": "Novo Nordisk (NOVO B) DCF: Beregn din egen fair value",
        "description": "Interaktiv DCF-model for Novo Nordisk. Juster dine antagelser om vækst, "
                       "margin og WACC og se kursmål og fair value i realtid.",
        "image": f"{OG}/novo-dcf-2026-05-19.png",
    },
    "analyse/zeal/2026-05-13": {
        "title": "Shortanalyse: Hvem vædder imod Zealand Pharma?",
        "description": "Dybdegående analyse af short-positioner i Zealand Pharma (ZEAL). "
                       "Hvem shorter, hvor meget, og hvorfor?",
        "image": f"{OG}/zeal-2026-05-13.png",
    },
    "analyse/zeal/gennemsnitspris/2026-05-14": {
        "title": "Til hvilken kurs har de shortet Zealand Pharma?",
        "description": "Fire beregningsmetoder sammenlignet. Estimeret indgangspris per "
                       "short-sælger og analyse af hvem der tjener penge.",
        "image": f"{OG}/zeal-gennemsnitspris-2026-05-14.png",
    },
    "analyse/c25/2026-05-28": {
        "title": "Hvorfor C25 har stået stille i 5 år",
        "description": "C25 -2% mens peers steg 40-79%. Sektorforskydninger og "
                       "enkelt-aktie-kollaps forklarer det danske efterslæb.",
        "image": f"{OG}/c25-2026-05-28.png",
    },
}

# Short (undated) routes resolve to the same metadata as the dated route.
_ALIASES = {
    "analyse/gn": "analyse/gn/2026-05-14",
    "analyse/bava": "analyse/bava/2026-05-17",
    "analyse/pandora": "analyse/pandora/2026-05-23",
    "analyse/novo/dcf": "analyse/novo/dcf/2026-05-19",
    "analyse/zeal": "analyse/zeal/2026-05-13",
    "analyse/zeal/gennemsnitspris": "analyse/zeal/gennemsnitspris/2026-05-14",
    "analyse/c25": "analyse/c25/2026-05-28",
}


def _esc(text: str) -> str:
    """Escape a string for use inside an HTML double-quoted attribute."""
    return (text.replace("&", "&amp;").replace('"', "&quot;")
                .replace("<", "&lt;").replace(">", "&gt;"))


def _set_meta(html: str, key: str, value: str, attr: str = "property") -> str:
    """Replace the content of an existing <meta {attr}="{key}" content="..."> tag."""
    pattern = re.compile(r'(<meta %s="%s" content=")[^"]*(")' % (attr, re.escape(key)))
    return pattern.sub(lambda m: m.group(1) + value + m.group(2), html, count=1)


def _render_with_og(meta: dict, url: str) -> str:
    with open(INDEX_PATH, encoding="utf-8") as f:
        html = f.read()

    title = _esc(meta["title"])
    desc = _esc(meta["description"])
    img = meta["image"]

    html = re.sub(r"<title>.*?</title>",
                  lambda m: f"<title>{title} | Zirium</title>",
                  html, count=1, flags=re.DOTALL)

    html = _set_meta(html, "og:title", title)
    html = _set_meta(html, "og:description", desc)
    html = _set_meta(html, "og:type", "article")
    html = _set_meta(html, "og:url", url)
    html = _set_meta(html, "twitter:title", title, attr="name")
    html = _set_meta(html, "twitter:description", desc, attr="name")
    html = _set_meta(html, "twitter:card", "summary_large_image", attr="name")

    # The default index.html has no og:image / twitter:image; inject them after og:url.
    image_tags = (
        f'<meta property="og:url" content="{url}" />\n'
        f'    <meta property="og:image" content="{img}" />\n'
        f'    <meta property="og:image:width" content="1200" />\n'
        f'    <meta property="og:image:height" content="630" />\n'
        f'    <meta name="twitter:image" content="{img}" />'
    )
    html = html.replace(f'<meta property="og:url" content="{url}" />', image_tags, 1)

    return html


def analysis_page(request, subpath: str = ""):
    """Serve dist/index.html with per-analysis OG tags injected for crawlers."""
    norm = ("analyse/" + subpath).strip("/") if subpath else "analyse"
    norm = _ALIASES.get(norm, norm)
    meta = ANALYSIS_META.get(norm, ANALYSIS_META["analyse"])
    url = f"{SITE}/{norm}"
    try:
        return HttpResponse(_render_with_og(meta, url))
    except FileNotFoundError:
        # Dev fallback (no build present): let the normal template path handle it.
        return render(request, "index.html")
