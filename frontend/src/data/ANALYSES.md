# How to add a new analysis

`analyses.json` (in this folder) is the **single source of truth** for the list
of published analyses. Three places read it:

- **Web** — `analyses.ts` imports it and maps it to the `Analysis[]` the site
  uses (cards, sidebars, the `/analyse` index, the "latest analysis" link on
  stock pages). It uses `slug`, `title`, `subtitle`, `excerpt`, `date`,
  `readingMinutes`, `code`; it ignores the `og*` fields.
- **Server-side OG tags** — `home_page/og_views.py` builds the crawler preview
  (Slack/Facebook/X) from `ogTitle`, `ogDescription`, `ogImage`. The article
  pages themselves are normal React routes; this only rewrites the meta tags.
- **iOS app** — `GET /v18/analyses?lang=da|en` (`home_page/views.py`) returns a
  flat, localized list for the in-app "Analyser" screen.

So publishing the *metadata* for an analysis is one JSON edit. (The article
itself is still a hand-built React page, see step 1.)

## `analyses.json` shape
```jsonc
{
  "index": {                       // OG preview for the /analyse list page
    "ogTitle": "Analyser af danske aktier",
    "ogDescription": "…",
    "ogImage": "analyse-index"     // base filename, no dir, no extension
  },
  "analyses": [                    // ORDER = display order (newest first)
    {
      "slug": "c25/2026-05-28",    // path after /analyse/ ; must match the React route
      "code": "",                  // related stock ISIN, or "" if none
      "title": "OMX Copenhagen 25 (C25)",
      "subtitle": { "da": "…", "en": "…" },   // headline
      "excerpt":  { "da": "…", "en": "…" },   // card teaser
      "date":     { "da": "28. maj 2026", "en": "May 28, 2026" },  // display label
      "readingMinutes": 10,
      "ogImage": "c25-2026-05-28", // base filename in /og-images/ (no ext)
      "ogTitle": "Hvorfor C25 har stået stille i 5 år",            // social title
      "ogDescription": "C25 -2% mens peers steg 40-79%. …"         // social description
    }
  ]
}
```

Notes:
- `ogTitle`/`ogDescription` are Danish; crawlers get these regardless of viewer
  language (that is the existing, intentional behavior).
- `ogImage` is the **base** name. The English social/app thumbnail is derived as
  `{ogImage}-en.png`, so both files must exist (see step 3).
- The undated stem of the slug is auto-aliased for OG: `/analyse/c25` resolves to
  the same analysis as `/analyse/c25/2026-05-28` (stem = slug minus the trailing
  `/YYYY-MM-DD`). You do not add aliases manually.
- `slug` is the canonical URL. If you change an analysis's date you change its
  slug, so you must also update its React route and accept that old links break.
- The `date` label and the date in the `slug` may differ (the slug is the URL,
  the label is what's shown). Keep the array ordered newest-first.

## Steps to publish a new analysis
1. **Write the article page(s)** in `frontend/src/routes/`, e.g.
   `XyzAnalysisPage.tsx` (and `XyzAnalysisPage.en.tsx` for English). Copy an
   existing one such as `C25AnalysisPage.tsx` for structure, SEO/meta, and the
   sources/method footer.
2. **Register the route** in `frontend/src/App.tsx`: add the `lazy(() => …)`
   import and a route for `/analyse/<slug>`. If bilingual, follow the existing
   `function XyzAnalysisPage()` da/en switcher pattern used by the others.
3. **Add the OG images** to `frontend/public/og-images/`: `<ogImage>.png` and
   `<ogImage>-en.png`, both **1200x630**.
4. **Add one entry** to the **top** of the `analyses` array in `analyses.json`
   (newest first), filling every field above.
5. **Build & deploy:** `cd frontend && npm run build`, then deploy. Reload the
   backend web app so `og_views` reloads its cached metadata map (it caches the
   parsed JSON per process). The backend reads this file from
   `frontend/src/data/analyses.json` at runtime, so `src/` must be present on the
   server (it is on a full-repo deploy).
6. **Verify:**
   - `GET /v18/analyses` includes the new entry, localized.
   - Open `/analyse/<slug>` (web) and `/analyse/<slug>?embed=1` (no site nav,
     for the iOS WebView).
   - Paste the link in Slack (or opengraph.xyz) to confirm the preview. Purge
     Cloudflare for the path if the old preview is cached.

## Gotchas
- **Backend OG is cached per process** (`og_views._meta_cache`). After editing
  the JSON in production, reload the web app or the old preview persists.
- **Web bundles the JSON at build time** — changes need `npm run build`.
- **Both OG image variants** (`.png` and `-en.png`) must exist or the thumbnail
  404s in the app / social card.
- Don't reintroduce a second copy of this data (there used to be a hardcoded map
  in `og_views.py` and the array in `analyses.ts`). Everything reads this file.
