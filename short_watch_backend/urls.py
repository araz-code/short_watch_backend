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
from django.views.generic import TemplateView
from django.views.static import serve

from short_watch_backend import settings


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
    path('stats/', include('request_logging.urls')),
    path('favicon.png', serve, {'path': 'images/favicon.png', 'document_root': settings.STATIC_ROOT}),
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
    path('', TemplateView.as_view(template_name="index.html")),
    re_path(r'^(?:.*)/?$', TemplateView.as_view(template_name="index.html")),
]

# Serve the favicon
urlpatterns += [
]


if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

