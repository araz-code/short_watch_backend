from django.urls import path, include
from rest_framework import routers

from shorts.views import ShortedStockView, ShortSellerView, ShortedStockDetailsView

router = routers.DefaultRouter(trailing_slash=False)
router.register('pick', ShortedStockView)
router.register('watch', ShortedStockView)
router.register('pick/sellers', ShortSellerView)
router.register('watch/sellers', ShortSellerView)
router.register('watch/details', ShortedStockDetailsView)
router.register('pick/details', ShortedStockDetailsView)
router.register('test/pick', ShortedStockView)
router.register('test/watch', ShortedStockView)
router.register('test/pick/sellers', ShortSellerView)
router.register('test/watch/sellers', ShortSellerView)
router.register('test/watch/details', ShortedStockDetailsView)
router.register('test/pick/details', ShortedStockDetailsView)

router.register('iphone/pick', ShortedStockView)
router.register('ipad/pick', ShortedStockView)
router.register('iphone/watch', ShortedStockView)
router.register('ipad/watch', ShortedStockView)
router.register('iphone/test/pick', ShortedStockView)
router.register('ipad/test/pick', ShortedStockView)
router.register('iphone/test/watch', ShortedStockView)
router.register('ipad/test/watch', ShortedStockView)
router.register('iphone/test/watch/details', ShortedStockDetailsView)
router.register('ipad/test/watch/details', ShortedStockDetailsView)
router.register('iphone/test/pick/details', ShortedStockDetailsView)
router.register('ipad/test/pick/details', ShortedStockDetailsView)


urlpatterns = [
    path('', include(router.urls))
]
