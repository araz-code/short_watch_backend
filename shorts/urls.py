from django.urls import path, include
from rest_framework import routers

from shorts.views import ShortPositionView, OldShortSellerView, ShortPositionDetailView, ShortSellerView, stats_view, top_lists_view

router = routers.DefaultRouter(trailing_slash=False)


def _register(prefix, viewset):
    router.register(prefix, viewset, basename=prefix.replace('/', '-'))


_register('pick', ShortPositionView)
_register('watch', ShortPositionView)
_register('pick/sellers', OldShortSellerView)
_register('watch/sellers', OldShortSellerView)
_register('watch/details', ShortPositionDetailView)
_register('pick/details', ShortPositionDetailView)

_register('short-sellers', ShortSellerView)

devices = ['iphone', 'ipad', 'iwatch', 'web']

for device in devices:
    _register(f'{device}/short-sellers', ShortSellerView)

for test_prefix in ['', 'test/']:
    for device in devices:
        for category in ['pick', 'watch']:
            _register(f'{device}/{test_prefix}{category}', ShortPositionView)
            _register(f'{device}/{test_prefix}{category}/details', ShortPositionDetailView)

urlpatterns = [
    path('homepage-stats', stats_view, name='stats'),
    path('top-lists', top_lists_view, name='top-lists'),
    path('', include(router.urls)),
]
