"""Shared loader for the analyses registry.

frontend/src/data/analyses.json is the single source of truth for the published
analyses. The web bundles it at build time; the backend reads the same file for
the server-side Open Graph injection (og_views) and the /v18/analyses API, so
all three surfaces stay in sync from one file.
"""
import json
import os

from django.conf import settings

ANALYSES_JSON_PATH = os.path.join(settings.FRONTEND_DIR, "src", "data", "analyses.json")

_cache = None


def load_analyses():
    """Return the parsed analyses.json as {'index': {...}, 'analyses': [...]}.

    Cached per process. Returns an empty structure if the file is unavailable
    (so callers degrade gracefully instead of erroring); a transient miss is not
    cached, so it recovers once the file is present.
    """
    global _cache
    if _cache is not None:
        return _cache
    try:
        with open(ANALYSES_JSON_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return {"index": {}, "analyses": []}
    _cache = data
    return _cache
