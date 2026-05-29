"""Server-side Open Graph injection for analysis pages.

The SPA is served as a single static dist/index.html for every route. Social
crawlers (Slack, Facebook, LinkedIn, X) do not execute JavaScript, so the
per-analysis OG tags that React sets client-side never reach them; they only
see the generic tags baked into index.html.

This view intercepts /analyse/... routes, reads the same dist/index.html, and
rewrites the OG/Twitter/title tags server-side. The metadata comes from the
shared analyses.json (see home_page.analyses_data), the same file the web build
and the /v18/analyses API use, so there is a single source of truth. Real users
still get the full SPA (the #root div and JS bundle are untouched); crawlers get
the correct per-analysis preview.
"""
import os
import re

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render

from home_page.analyses_data import load_analyses

INDEX_PATH = os.path.join(settings.FRONTEND_DIR, "dist", "index.html")
SITE = "https://www.zirium.dk"
OG = f"{SITE}/og-images"

_DATE_SUFFIX = re.compile(r"/\d{4}-\d{2}-\d{2}$")
_meta_cache = None


def _build_meta():
    """Build the path -> OG metadata map from analyses.json. Both the dated route
    (analyse/c25/2026-05-28) and the undated stem (analyse/c25) map to the same
    analysis; 'canonical' holds the dated path used for og:url."""
    data = load_analyses()
    idx = data.get("index", {})
    meta = {
        "analyse": {
            "title": idx.get("ogTitle", "Analyser af danske aktier"),
            "description": idx.get("ogDescription", ""),
            "image": f"{OG}/{idx.get('ogImage', 'analyse-index')}.png",
            "canonical": "analyse",
        }
    }
    for a in data.get("analyses", []):
        slug = a["slug"]
        canonical = "analyse/" + slug
        entry = {
            "title": a["ogTitle"],
            "description": a["ogDescription"],
            "image": f"{OG}/{a['ogImage']}.png",
            "canonical": canonical,
        }
        meta[canonical] = entry
        stem = "analyse/" + _DATE_SUFFIX.sub("", slug)
        meta.setdefault(stem, entry)
    return meta


def _meta_map():
    global _meta_cache
    if _meta_cache is None:
        _meta_cache = _build_meta()
    return _meta_cache


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
    meta_map = _meta_map()
    entry = meta_map.get(norm)
    if entry is not None:
        url = f"{SITE}/{entry['canonical']}"
    else:
        # Unknown analyse path: fall back to the index metadata, but keep the
        # requested path as the canonical url (matches the previous behaviour).
        entry = meta_map["analyse"]
        url = f"{SITE}/{norm}"
    try:
        return HttpResponse(_render_with_og(entry, url))
    except FileNotFoundError:
        # Dev fallback (no build present): let the normal template path handle it.
        return render(request, "index.html")
