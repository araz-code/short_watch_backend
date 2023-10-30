from django.urls import path, include
from rest_framework import routers

from shorts.views import ShortedStockView


router = routers.DefaultRouter(trailing_slash=False)
router.register('pick', ShortedStockView)
router.register('watch', ShortedStockView)


urlpatterns = [
    path('', include(router.urls))
]
