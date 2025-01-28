from django.urls import path, include
from rest_framework import routers

from shorts.views import ShortPositionView, OldShortSellerView, ShortPositionDetailView, ShortSellerView

router = routers.DefaultRouter(trailing_slash=False)


router.register('pick', ShortPositionView)
router.register('watch', ShortPositionView)
router.register('pick/sellers', OldShortSellerView)
router.register('watch/sellers', OldShortSellerView)
router.register('watch/details', ShortPositionDetailView)
router.register('pick/details', ShortPositionDetailView)

router.register('short-sellers', ShortSellerView)

devices = ['iphone', 'ipad', 'iwatch', 'web']

for test_prefix in ['', 'test/']:
    for device in devices:
        router.register(f'{device}/short-sellers', ShortSellerView)

        for category in ['pick', 'watch']:
            router.register(f'{device}/{test_prefix}{category}', ShortPositionView)
            router.register(f'{device}/{test_prefix}{category}/details', ShortPositionDetailView)

urlpatterns = [
    path('', include(router.urls))
]
