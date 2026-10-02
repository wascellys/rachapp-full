from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'posts', views.PostViewSet, basename='social-post')
router.register(r'comentarios', views.ComentarioViewSet, basename='social-comentario')
router.register(r'amizades', views.AmizadeViewSet, basename='social-amizade')
router.register(r'notificacoes', views.NotificacaoViewSet, basename='social-notificacao')

urlpatterns = [
    path('usuarios/', views.buscar_usuarios, name='social-usuarios'),
    path('perfis/<str:username>/', views.perfil, name='social-perfil'),
    path('resumo/', views.resumo, name='social-resumo'),
    path('', include(router.urls)),
]
