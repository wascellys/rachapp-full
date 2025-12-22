from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, RachaViewSet, PremioViewSet,
    PartidaViewSet, SolicitacaoRachaViewSet
)

router = DefaultRouter()
router.register(r'usuarios', UserViewSet, basename='usuario')
router.register(r'rachas', RachaViewSet, basename='racha')
router.register(r'premios', PremioViewSet, basename='premio')
router.register(r'partidas', PartidaViewSet, basename='partida')
router.register(r'solicitacoes', SolicitacaoRachaViewSet, basename='solicitacao')

urlpatterns = [
    path('', include(router.urls)),
]
