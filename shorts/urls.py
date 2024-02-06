from django.urls import path, include
from rest_framework import routers

from shorts.views import ShortPositionView, ShortSellerView, ShortPositionDetailView

router = routers.DefaultRouter(trailing_slash=False)


router.register('pick', ShortPositionView)
router.register('watch', ShortPositionView)
router.register('pick/sellers', ShortSellerView)
router.register('watch/sellers', ShortSellerView)
router.register('watch/details', ShortPositionDetailView)
router.register('pick/details', ShortPositionDetailView)


devices = ['iphone', 'ipad', 'iwatch', 'web']

for category in ['pick', 'watch']:
    for test_prefix in ['', 'test/']:
        for device in devices:
            router.register(f'{device}/{test_prefix}{category}', ShortPositionView)
            router.register(f'{device}/{test_prefix}{category}/details', ShortPositionDetailView)


urlpatterns = [
    path('', include(router.urls))
]
