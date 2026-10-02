from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import album
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
    path('rachas/<uuid:racha_id>/album/', album.album, name='album'),
    path('rachas/<uuid:racha_id>/album/painel/', album.painel, name='album-painel'),
    path('rachas/<uuid:racha_id>/album/paginas/', album.gerar_paginas, name='album-paginas'),
    path('rachas/<uuid:racha_id>/album/pacotes/', album.distribuir_pacotes, name='album-pacotes'),
    path('rachas/<uuid:racha_id>/album/abrir/', album.abrir_pacote, name='album-abrir'),
    path('rachas/<uuid:racha_id>/album/colar/', album.colar_figurinhas, name='album-colar'),
    path('', include(router.urls)),
]
