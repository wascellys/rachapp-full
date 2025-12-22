from rest_framework import permissions
from .models import Racha, JogadoresRacha


class IsAdminRacha(permissions.BasePermission):
    """
    Permissão para verificar se o usuário é administrador do racha.
    """
    
    def has_object_permission(self, request, view, obj):
        # obj deve ser uma instância de Racha
        if isinstance(obj, Racha):
            return obj.administrador == request.user
        return False


class IsJogadorRacha(permissions.BasePermission):
    """
    Permissão para verificar se o usuário é jogador do racha.
    """
    
    def has_object_permission(self, request, view, obj):
        # obj deve ser uma instância de Racha
        if isinstance(obj, Racha):
            return JogadoresRacha.objects.filter(
                racha=obj,
                jogador=request.user,
                ativo=True
            ).exists()
        return False


class IsAdminRachaOrReadOnly(permissions.BasePermission):
    """
    Permissão que permite que apenas o admin do racha edite,
    mas qualquer jogador pode visualizar.
    """
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            # Verificar se é jogador do racha
            if isinstance(obj, Racha):
                return JogadoresRacha.objects.filter(
                    racha=obj,
                    jogador=request.user,
                    ativo=True
                ).exists() or obj.administrador == request.user
            return True
        
        # Apenas admin pode editar
        if isinstance(obj, Racha):
            return request.user in obj.administrador.all()
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permissão que permite que apenas o proprietário edite seu próprio objeto.
    """
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return obj.id == request.user.id


class IsAdminRachaOrOwner(permissions.BasePermission):
    """
    Permissão que permite que o admin do racha ou o próprio usuário editem.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Se é o próprio usuário
        if hasattr(obj, 'jogador') and obj.jogador == request.user:
            return True
        
        # Se é admin do racha
        if hasattr(obj, 'racha'):
            return obj.racha.administrador == request.user
        
        return False
