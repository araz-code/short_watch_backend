from django.urls import path, include
from rest_framework import routers

from shorts.views import ShortedStockView, ShortSellerView

router = routers.DefaultRouter(trailing_slash=False)
router.register('pick', ShortedStockView)
router.register('watch', ShortedStockView)
router.register('pick/sellers', ShortSellerView)
router.register('watch/sellers', ShortSellerView)
router.register('test/pick', ShortedStockView)
router.register('test/watch', ShortedStockView)
router.register('test/pick/sellers', ShortSellerView)
router.register('test/watch/sellers', ShortSellerView)


urlpatterns = [
    path('', include(router.urls))
]
