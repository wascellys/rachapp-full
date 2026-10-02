"""Regras da rede social reutilizadas por views e serializers."""
import re

from django.contrib.auth import get_user_model
from django.db.models import Count, Exists, OuterRef, Q

from rachas.serializers import get_image_url

from .models import Amizade, Curtida, Notificacao, Post

User = get_user_model()

# @usuario: precedido por início de texto ou caractere que não seja de palavra (evita e-mails)
MENCAO_RE = re.compile(r'(?<![\w@])@([\w.+-]+)')
MAX_MENCOES = 20


def nome_usuario(user):
    return user.get_full_name() or user.username


def usuario_json(user):
    return {
        'id': str(user.id),
        'username': user.username,
        'nome': nome_usuario(user),
        'imagem_perfil': get_image_url(user.imagem_perfil),
        'posicao': user.posicao,
    }


def extrair_mencoes(texto, autor=None):
    """Usuários citados como @username no texto (sem repetir, sem o próprio autor)."""
    nomes = []
    for bruto in MENCAO_RE.findall(texto or ''):
        nome = bruto.rstrip('.-+')
        if nome and nome.lower() not in {n.lower() for n in nomes}:
            nomes.append(nome)
        if len(nomes) >= MAX_MENCOES:
            break
    if not nomes:
        return []
    filtro = Q()
    for nome in nomes:
        filtro |= Q(username__iexact=nome)
    usuarios = User.objects.filter(filtro, is_active=True)
    if autor is not None:
        usuarios = usuarios.exclude(pk=autor.pk)
    return list(usuarios)


def notificar(destinatario, ator, tipo, post=None, comentario=None):
    """Cria uma notificação (nunca para a própria pessoa)."""
    if destinatario.pk == ator.pk:
        return None
    return Notificacao.objects.create(
        destinatario=destinatario, ator=ator, tipo=tipo, post=post, comentario=comentario
    )


_BUSCAR = object()


def status_amizade(viewer, outro, amizade=_BUSCAR):
    """'eu', 'amigos', 'enviada' (viewer pediu), 'recebida' (outro pediu) ou 'nenhuma'.

    `amizade` já carregada pode ser passada (inclusive None) para evitar nova consulta.
    """
    if viewer.pk == outro.pk:
        return 'eu', None
    if amizade is _BUSCAR:
        amizade = Amizade.entre(viewer, outro)
    if not amizade:
        return 'nenhuma', None
    if amizade.status == Amizade.ACEITA:
        return 'amigos', amizade
    return ('enviada' if amizade.solicitante_id == viewer.pk else 'recebida'), amizade


def posts_visiveis(user, amigos=None):
    """Posts que o usuário pode ver: os próprios, os públicos e os de amigos marcados como 'só amigos'."""
    amigos = Amizade.ids_amigos(user) if amigos is None else amigos
    return Post.objects.filter(
        Q(autor=user) | Q(visibilidade=Post.PUBLICO) | Q(visibilidade=Post.AMIGOS, autor_id__in=amigos)
    )


def pode_ver(post, user, amigos):
    return (
        post.autor_id == user.pk
        or post.visibilidade == Post.PUBLICO
        or (post.visibilidade == Post.AMIGOS and post.autor_id in amigos)
    )


def anotar_posts(queryset, user):
    """Contadores e 'curtido por mim' em uma única consulta."""
    return (
        queryset.select_related('autor', 'compartilhado_de__autor')
        .prefetch_related('mencoes', 'compartilhado_de__mencoes')
        .annotate(
            total_curtidas=Count('curtidas', distinct=True),
            total_comentarios=Count('comentarios', distinct=True),
            total_compartilhamentos=Count('compartilhamentos', distinct=True),
            curtido=Exists(Curtida.objects.filter(post=OuterRef('pk'), usuario=user)),
        )
    )
