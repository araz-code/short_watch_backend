"""short_watch_backend URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse
from django.views.generic import TemplateView
from django.views.static import serve
from django.views.decorators.cache import cache_control

from short_watch_backend import settings
from home_page import og_views
from home_page.views import analyses_view

import os

FRONTEND_DIST = os.path.join(settings.FRONTEND_DIR, 'dist')
OG_IMAGES_DIR = os.path.join(FRONTEND_DIST, 'og-images')


@cache_control(public=True, max_age=86400)
def serve_og_image(request, path):
    """Serve an OG/analysis image with a Cache-Control header so Cloudflare and
    clients cache it at the edge instead of hitting the origin on every request."""
    return serve(request, path, document_root=OG_IMAGES_DIR)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('shorts/', include('shorts.urls')),
    path('v2/shorts/', include('shorts.urls')),
    path('v3/shorts/', include('shorts.urls')),
    path('v4/shorts/', include('shorts.urls')),
    path('v5/shorts/', include('shorts.urls')),
    path('v6/shorts/', include('shorts.urls')),
    path('v7/shorts/', include('shorts.urls')),
    path('v8/shorts/', include('shorts.urls')),
    path('v9/shorts/', include('shorts.urls')),
    path('v10/shorts/', include('shorts.urls')),
    path('v10/users/', include('users.urls')),
    path('v11/shorts/', include('shorts.urls')),
    path('v11/users/', include('users.urls')),
    path('v12/shorts/', include('shorts.urls')),
    path('v12/users/', include('users.urls')),
    path('v12/sellers/', include('shorts.urls')),
    path('v13/shorts/', include('shorts.urls')),
    path('v13/users/', include('users.urls')),
    path('v13/sellers/', include('shorts.urls')),
    path('v14/shorts/', include('shorts.urls')),
    path('v14/users/', include('users.urls')),
    path('v14/sellers/', include('shorts.urls')),
    path('v15/shorts/', include('shorts.urls')),
    path('v15/users/', include('users.urls')),
    path('v16/shorts/', include('shorts.urls')),
    path('v16/users/', include('users.urls')),
    path('v17/shorts/', include('shorts.urls')),
    path('v17/users/', include('users.urls')),
    path('v18/shorts/', include('shorts.urls')),
    path('v18/users/', include('users.urls')),
    path('v18/insider/', include('insider_transactions.urls')),
    path('v19/shorts/', include('shorts.urls')),
    path('v19/users/', include('users.urls')),
    path('stats/', include('request_logging.urls')),
    path('v18/analyses', analyses_view),
    path('v19/analyses', analyses_view),
    path('favicon.svg', serve, {'path': 'favicon.svg', 'document_root': FRONTEND_DIST}),
    path('favicon.png', serve, {'path': 'favicon.png', 'document_root': FRONTEND_DIST}),
    path('manifest.json', serve, {'path': 'manifest.json', 'document_root': FRONTEND_DIST}),
    path('icon-192.png', serve, {'path': 'icon-192.png', 'document_root': FRONTEND_DIST}),
    path('icon-512.png', serve, {'path': 'icon-512.png', 'document_root': FRONTEND_DIST}),
    path('apple-touch-icon-57x57.png', serve,
         {'path': 'images/apple-touch-icon-57x57.png', 'document_root': settings.STATIC_ROOT}),
    path('apple-touch-icon-72x72.png', serve,
         {'path': 'images/apple-touch-icon-72x72.png', 'document_root': settings.STATIC_ROOT}),
    path('apple-touch-icon-114x114.png', serve,
         {'path': 'images/apple-touch-icon-114x114.png', 'document_root': settings.STATIC_ROOT}),
    path('apple-touch-icon-144x144.png', serve,
         {'path': 'images/apple-touch-icon-144x144.png', 'document_root': settings.STATIC_ROOT}),
    path('apple-touch-icon-152x152.png', serve,
         {'path': 'images/apple-touch-icon-152x152.png', 'document_root': settings.STATIC_ROOT}),
    path('apple-touch-icon-180x180.png', serve,
         {'path': 'images/apple-touch-icon-180x180.png', 'document_root': settings.STATIC_ROOT}),
    # OG/social images and the in-app analysis thumbnails. Without this route
    # /og-images/* falls through to the SPA catch-all and returns index.html
    # (text/html), so image loads fail. Serve the real PNGs from dist/og-images.
    re_path(r'^og-images/(?P<path>.*)$', serve_og_image),
    path('robots.txt', serve, {'path': 'robots.txt', 'document_root': FRONTEND_DIST}),
    path('sitemap.xml', lambda r: HttpResponse(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        '  <url><loc>https://www.zirium.dk/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/short-watch</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/short-sellers</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/top-lists</loc><changefreq>daily</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/insider-transactions</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse/ambu/2026-06-01</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse/c25/2026-05-28</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse/pandora/2026-05-23</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse/novo/dcf/2026-05-19</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse/bava/2026-05-17</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse/zeal/gennemsnitspris/2026-05-14</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse/gn/2026-05-14</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/analyse/zeal/2026-05-13</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/faq</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/contact</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/privacy-policy</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/cookie-policy</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n'
        '  <url><loc>https://www.zirium.dk/terms-of-agreement</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n'
        '</urlset>\n',
        content_type="application/xml"
    )),
    # Analysis routes get server-side Open Graph injection so social crawlers
    # (Slack/Facebook/LinkedIn/X), which do not run JS, see the correct per-page
    # preview instead of the generic index.html tags. Must precede the catch-all.
    re_path(r'^analyse(?:/(?P<subpath>.*?))?/?$', og_views.analysis_page),
    path('', TemplateView.as_view(template_name="index.html")),
    re_path(r'^(?:.*)/?$', TemplateView.as_view(template_name="index.html")),
]

# Serve the favicon
urlpatterns += [
]


if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

