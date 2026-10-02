from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from rachas.models import JogadoresRacha, JogadorPartida, PremioPartida, RegistroPartida

from .models import Amizade, Comentario, Curtida, Notificacao, Post
from .serializers import ComentarioSerializer, NotificacaoSerializer, PostCreateSerializer, PostSerializer
from .servicos import (
    anotar_posts, extrair_mencoes, notificar, pode_ver, posts_visiveis, status_amizade, usuario_json,
)

User = get_user_model()

FEEDS = ('amigos', 'explorar', 'reels')


class FeedPagination(PageNumberPagination):
    page_size = 10
    max_page_size = 30
    page_size_query_param = 'tamanho'


class PostViewSet(viewsets.GenericViewSet):
    """
    Feed e posts.
    GET  /social/posts/?feed=amigos|explorar|reels   ou   ?autor=<username>[&formato=REEL]
    POST /social/posts/  (multipart: texto, midia, formato, visibilidade)
    """

    pagination_class = FeedPagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = PostSerializer

    def _amigos(self):
        if not hasattr(self, '_cache_amigos'):
            self._cache_amigos = Amizade.ids_amigos(self.request.user)
        return self._cache_amigos

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'amigos': self._amigos()}

    def _visiveis(self):
        return posts_visiveis(self.request.user, self._amigos())

    def _post_visivel(self, pk):
        post = anotar_posts(self._visiveis(), self.request.user).filter(pk=pk).first()
        if not post:
            raise Http404('Post não encontrado.')
        return post

    def list(self, request):
        user = request.user
        qs = self._visiveis()
        autor = request.query_params.get('autor')
        if autor:
            qs = qs.filter(autor__username__iexact=autor)
            formato = request.query_params.get('formato')
            if formato in (Post.POST, Post.REEL):
                qs = qs.filter(formato=formato)
        else:
            feed = request.query_params.get('feed', 'amigos')
            if feed not in FEEDS:
                raise ValidationError({'feed': f'Use um destes: {", ".join(FEEDS)}.'})
            if feed == 'amigos':
                qs = qs.filter(Q(autor=user) | Q(autor_id__in=self._amigos()))
            elif feed == 'explorar':
                qs = qs.filter(visibilidade=Post.PUBLICO)
            else:
                qs = qs.filter(formato=Post.REEL)
        page = self.paginate_queryset(anotar_posts(qs, user).order_by('-criado_em'))
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def create(self, request):
        entrada = PostCreateSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data
        with transaction.atomic():
            post = Post.objects.create(
                autor=request.user, texto=dados['texto'], midia=dados.get('midia'),
                tipo_midia=dados['tipo_midia'], formato=dados['formato'], visibilidade=dados['visibilidade'],
            )
            citados = extrair_mencoes(post.texto, request.user)
            post.mencoes.set(citados)
            for citado in citados:
                if pode_ver(post, citado, Amizade.ids_amigos(citado)):
                    notificar(citado, request.user, Notificacao.MENCAO, post=post)
        return Response(self.get_serializer(self._post_visivel(post.pk)).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self._post_visivel(pk)).data)

    def destroy(self, request, pk=None):
        post = self._post_visivel(pk)
        if post.autor_id != request.user.pk:
            raise PermissionDenied('Só o autor pode apagar este post.')
        if post.midia:
            post.midia.delete(save=False)
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post', 'delete'])
    def curtir(self, request, pk=None):
        post = self._post_visivel(pk)
        if request.method == 'POST':
            _, criada = Curtida.objects.get_or_create(post=post, usuario=request.user)
            if criada and not Notificacao.objects.filter(
                destinatario=post.autor, ator=request.user, tipo=Notificacao.CURTIDA, post=post
            ).exists():
                notificar(post.autor, request.user, Notificacao.CURTIDA, post=post)
        else:
            Curtida.objects.filter(post=post, usuario=request.user).delete()
        return Response({
            'curtido': request.method == 'POST',
            'total_curtidas': Curtida.objects.filter(post=post).count(),
        })

    @action(detail=True, methods=['get', 'post'])
    def comentarios(self, request, pk=None):
        post = self._post_visivel(pk)
        if request.method == 'GET':
            qs = post.comentarios.select_related('autor', 'post').prefetch_related('mencoes')
            return Response(ComentarioSerializer(qs, many=True, context={'request': request}).data)
        entrada = ComentarioSerializer(data=request.data, context={'request': request})
        entrada.is_valid(raise_exception=True)
        with transaction.atomic():
            comentario = Comentario.objects.create(post=post, autor=request.user, texto=entrada.validated_data['texto'])
            citados = extrair_mencoes(comentario.texto, request.user)
            comentario.mencoes.set(citados)
            notificar(post.autor, request.user, Notificacao.COMENTARIO, post=post, comentario=comentario)
            for citado in citados:
                if citado.pk != post.autor_id and pode_ver(post, citado, Amizade.ids_amigos(citado)):
                    notificar(citado, request.user, Notificacao.MENCAO, post=post, comentario=comentario)
        return Response(ComentarioSerializer(comentario, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def compartilhar(self, request, pk=None):
        alvo = self._post_visivel(pk)
        original = alvo.compartilhado_de if alvo.eh_compartilhamento else alvo
        if original is None:
            raise ValidationError({'detail': 'Este conteúdo não está mais disponível.'})
        # Só posts públicos podem ser compartilhados (evita expor conteúdo "só amigos")
        if original.visibilidade != Post.PUBLICO and original.autor_id != request.user.pk:
            raise ValidationError({'detail': 'Só posts públicos podem ser compartilhados.'})
        texto = (request.data.get('texto') or '').strip()[:2200]
        visibilidade = request.data.get('visibilidade') or Post.PUBLICO
        if visibilidade not in (Post.PUBLICO, Post.AMIGOS):
            raise ValidationError({'visibilidade': 'Visibilidade inválida.'})
        with transaction.atomic():
            post = Post.objects.create(
                autor=request.user, texto=texto, compartilhado_de=original,
                eh_compartilhamento=True, visibilidade=visibilidade,
            )
            citados = extrair_mencoes(texto, request.user)
            post.mencoes.set(citados)
            notificar(original.autor, request.user, Notificacao.COMPARTILHAMENTO, post=post)
            for citado in citados:
                if pode_ver(post, citado, Amizade.ids_amigos(citado)):
                    notificar(citado, request.user, Notificacao.MENCAO, post=post)
        return Response(self.get_serializer(self._post_visivel(post.pk)).data, status=status.HTTP_201_CREATED)


class ComentarioViewSet(viewsets.GenericViewSet):
    """DELETE /social/comentarios/<id>/ — autor do comentário ou do post."""

    def destroy(self, request, pk=None):
        comentario = get_object_or_404(Comentario.objects.select_related('post'), pk=pk)
        if not pode_ver(comentario.post, request.user, Amizade.ids_amigos(request.user)):
            raise Http404
        if request.user.pk not in (comentario.autor_id, comentario.post.autor_id):
            raise PermissionDenied('Você não pode apagar este comentário.')
        comentario.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _com_status(viewer, usuarios):
    amizades = {}
    for a in Amizade.objects.filter(
        Q(solicitante=viewer, destinatario__in=usuarios) | Q(destinatario=viewer, solicitante__in=usuarios)
    ):
        outro = a.destinatario_id if a.solicitante_id == viewer.pk else a.solicitante_id
        amizades[outro] = a
    resultado = []
    for u in usuarios:
        situacao, amizade = status_amizade(viewer, u, amizades.get(u.pk))
        resultado.append({**usuario_json(u), 'amizade': situacao, 'amizade_id': str(amizade.id) if amizade else None})
    return resultado


@api_view(['GET'])
def buscar_usuarios(request):
    """
    GET /social/usuarios/?q=texto — busca em todos os rachas por nome ou @usuario.
    Sem q: sugestões (gente dos seus rachas que ainda não é sua amiga).
    """
    q = (request.query_params.get('q') or '').strip().lstrip('@')
    base = User.objects.filter(is_active=True)
    if q:
        filtro = Q(username__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q)
        partes = q.split()
        if len(partes) > 1:
            filtro |= Q(first_name__icontains=partes[0], last_name__icontains=partes[-1])
        usuarios = list(base.filter(filtro).exclude(pk=request.user.pk).order_by('first_name', 'username')[:20])
    else:
        meus_rachas = JogadoresRacha.objects.filter(jogador=request.user).values('racha_id')
        ja_ligados = set(Amizade.objects.filter(solicitante=request.user).values_list('destinatario_id', flat=True))
        ja_ligados |= set(Amizade.objects.filter(destinatario=request.user).values_list('solicitante_id', flat=True))
        usuarios = list(
            base.filter(rachas_participando__racha_id__in=meus_rachas)
            .exclude(pk=request.user.pk).exclude(pk__in=ja_ligados)
            .distinct().order_by('first_name', 'username')[:20]
        )
    return Response(_com_status(request.user, usuarios))


@api_view(['GET'])
def perfil(request, username):
    """GET /social/perfis/<username>/ — dados, estatísticas de todos os rachas e situação da amizade."""
    user = get_object_or_404(User, username__iexact=username, is_active=True)
    situacao, amizade = status_amizade(request.user, user)
    amigos = Amizade.ids_amigos(user)
    posts = posts_visiveis(request.user).filter(autor=user)
    return Response({
        **usuario_json(user),
        'membro_desde': user.data_criacao,
        'amizade': situacao,
        'amizade_id': str(amizade.id) if amizade else None,
        'estatisticas': {
            'gols': RegistroPartida.objects.filter(jogador_gol=user).count(),
            'assistencias': RegistroPartida.objects.filter(jogador_assistencia=user).count(),
            'jogos': JogadorPartida.objects.filter(jogador=user, presente=True).count(),
            'rachas': JogadoresRacha.objects.filter(jogador=user).values('racha').distinct().count(),
            'premios': PremioPartida.objects.filter(jogador=user).count(),
        },
        'social': {
            'amigos': len(amigos),
            'posts': posts.filter(formato=Post.POST).count(),
            'reels': posts.filter(formato=Post.REEL).count(),
        },
    })


class AmizadeViewSet(viewsets.GenericViewSet):
    """
    GET    /social/amizades/            amigos, pedidos recebidos e enviados
    POST   /social/amizades/            {usuario_id} envia pedido (aceita se já houver pedido do outro lado)
    POST   /social/amizades/<id>/aceitar/
    DELETE /social/amizades/<id>/       recusa, cancela ou desfaz
    """

    def list(self, request):
        user = request.user
        rel = Amizade.objects.filter(Q(solicitante=user) | Q(destinatario=user)).select_related('solicitante', 'destinatario')

        def item(a):
            outro = a.destinatario if a.solicitante_id == user.pk else a.solicitante
            return {**usuario_json(outro), 'amizade_id': str(a.id), 'desde': a.respondido_em or a.criado_em}

        return Response({
            'amigos': sorted((item(a) for a in rel if a.status == Amizade.ACEITA), key=lambda x: x['nome'].lower()),
            'recebidas': [item(a) for a in rel if a.status == Amizade.PENDENTE and a.destinatario_id == user.pk],
            'enviadas': [item(a) for a in rel if a.status == Amizade.PENDENTE and a.solicitante_id == user.pk],
        })

    def create(self, request):
        alvo = get_object_or_404(User, pk=request.data.get('usuario_id'), is_active=True)
        if alvo.pk == request.user.pk:
            raise ValidationError({'detail': 'Você não pode adicionar a si mesmo.'})
        existente = Amizade.entre(request.user, alvo)
        if existente:
            if existente.status == Amizade.PENDENTE and existente.destinatario_id == request.user.pk:
                return self._aceitar(existente)
            raise ValidationError({'detail': 'Vocês já são amigos.' if existente.status == Amizade.ACEITA else 'Pedido já enviado.'})
        try:
            amizade = Amizade.objects.create(solicitante=request.user, destinatario=alvo)
        except IntegrityError:
            raise ValidationError({'detail': 'Pedido já enviado.'})
        notificar(alvo, request.user, Notificacao.AMIZADE_PEDIDO)
        return Response({'amizade': 'enviada', 'amizade_id': str(amizade.id)}, status=status.HTTP_201_CREATED)

    def _aceitar(self, amizade):
        amizade.status = Amizade.ACEITA
        amizade.respondido_em = timezone.now()
        amizade.save(update_fields=['status', 'respondido_em'])
        Notificacao.objects.filter(
            destinatario=amizade.destinatario, ator=amizade.solicitante, tipo=Notificacao.AMIZADE_PEDIDO
        ).update(lida=True)
        notificar(amizade.solicitante, amizade.destinatario, Notificacao.AMIZADE_ACEITA)
        return Response({'amizade': 'amigos', 'amizade_id': str(amizade.id)})

    @action(detail=True, methods=['post'])
    def aceitar(self, request, pk=None):
        amizade = get_object_or_404(Amizade, pk=pk, destinatario=request.user, status=Amizade.PENDENTE)
        return self._aceitar(amizade)

    def destroy(self, request, pk=None):
        amizade = get_object_or_404(Amizade.objects.filter(Q(solicitante=request.user) | Q(destinatario=request.user)), pk=pk)
        amizade.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificacaoViewSet(viewsets.GenericViewSet):
    """GET /social/notificacoes/ (50 mais recentes) · POST /social/notificacoes/ler/ marca todas como lidas."""

    def list(self, request):
        qs = Notificacao.objects.filter(destinatario=request.user).select_related('ator', 'comentario')[:50]
        return Response({
            'nao_lidas': Notificacao.objects.filter(destinatario=request.user, lida=False).count(),
            'itens': NotificacaoSerializer(qs, many=True).data,
        })

    @action(detail=False, methods=['post'])
    def ler(self, request):
        marcadas = Notificacao.objects.filter(destinatario=request.user, lida=False).update(lida=True)
        return Response({'marcadas': marcadas})


@api_view(['GET'])
def resumo(request):
    """Contadores para os selos do menu."""
    return Response({
        'notificacoes_nao_lidas': Notificacao.objects.filter(destinatario=request.user, lida=False).count(),
        'pedidos_amizade': Amizade.objects.filter(destinatario=request.user, status=Amizade.PENDENTE).count(),
    })
