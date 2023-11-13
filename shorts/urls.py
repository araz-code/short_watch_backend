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


urlpatterns = [
    path('', include(router.urls))
]
