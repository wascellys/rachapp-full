from rest_framework import permissions
from .models import Racha, JogadoresRacha


def is_admin_racha(user, racha):
    """Retorna True se o usuário é um dos administradores do racha."""
    if not user or not user.is_authenticated:
        return False
    return racha.administrador.filter(id=user.id).exists()


def is_membro_racha(user, racha, apenas_ativos=True):
    """Retorna True se o usuário participa do racha (ou o administra)."""
    if not user or not user.is_authenticated:
        return False
    filtro = JogadoresRacha.objects.filter(racha=racha, jogador=user)
    if apenas_ativos:
        filtro = filtro.filter(ativo=True)
    return filtro.exists() or is_admin_racha(user, racha)


class IsAdminRacha(permissions.BasePermission):
    """
    Permissão para verificar se o usuário é administrador do racha.
    """

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Racha):
            return is_admin_racha(request.user, obj)
        return False


class IsJogadorRacha(permissions.BasePermission):
    """
    Permissão para verificar se o usuário é jogador do racha.
    """

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Racha):
            return is_membro_racha(request.user, obj)
        return False


class IsAdminRachaOrReadOnly(permissions.BasePermission):
    """
    Permissão que permite que apenas o admin do racha edite,
    mas qualquer jogador pode visualizar.
    """

    def has_object_permission(self, request, view, obj):
        if not isinstance(obj, Racha):
            return False

        if request.method in permissions.SAFE_METHODS:
            return is_membro_racha(request.user, obj, apenas_ativos=False)

        return is_admin_racha(request.user, obj)


class IsSelfOrReadOnly(permissions.BasePermission):
    """
    Permissão que permite que apenas o próprio usuário altere seu cadastro.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.id == request.user.id
