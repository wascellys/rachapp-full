import ipaddress
import logging
import mimetypes
import socket
from io import BytesIO
from urllib.parse import urlparse

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import HttpResponse

from .models import (
    User, Racha, JogadoresRacha, Premio, Partida,
    JogadorPartida, RegistroPartida, PremioPartida, SolicitacaoRacha
)
from .serializers import (
    UserSerializer, UserDetailSerializer, UserCreateSerializer, RachaSerializer, RachaDetailSerializer,
    JogadoresRachaSerializer, PremioSerializer, PartidaSerializer, PartidaDetailSerializer,
    JogadorPartidaSerializer, RegistroPartidaSerializer, PremioPartidaSerializer,
    SolicitacaoRachaSerializer, RankingJogadorSerializer, RankingArtilhariaSerializer,
    RankingAssistenciasSerializer, get_image_url
)
from .permissions import IsAdminRachaOrReadOnly, IsSelfOrReadOnly, is_admin_racha

logger = logging.getLogger(__name__)

PROXY_IMAGE_MAX_BYTES = 8 * 1024 * 1024


def _parse_bool(value, default=None):
    """Converte valores vindos de JSON/form (true, "false", 0...) em bool."""
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in ('1', 'true', 'sim', 'yes', 'on'):
        return True
    if normalized in ('0', 'false', 'nao', 'não', 'no', 'off'):
        return False
    return default


def _url_publica(url):
    """Aceita apenas URLs http(s) que resolvem para IPs públicos (evita SSRF)."""
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        return False
    try:
        infos = socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == 'https' else 80))
    except (socket.gaierror, UnicodeError):
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


def _rachas_do_usuario(user):
    return Racha.objects.filter(
        Q(administrador=user) | Q(jogadores_racha__jogador=user)
    ).distinct()


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar usuários/jogadores"""

    queryset = User.objects.all().order_by('first_name', 'username')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSelfOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=['get'])
    def proxy_image(self, request):
        """Proxy para imagens (evita CORS ao gerar a carta para compartilhar)"""
        import requests

        url = request.query_params.get('url')
        if not url:
            return Response({'erro': 'URL obrigatória'}, status=status.HTTP_400_BAD_REQUEST)

        # Imagens do próprio backend: lê direto do storage, sem requisição HTTP
        media_base = settings.BASE_URL_IMAGES
        if media_base and url.startswith(media_base):
            nome = url[len(media_base):].split('?', 1)[0]
            if '..' in nome or not default_storage.exists(nome):
                return Response({'erro': 'Imagem não encontrada'}, status=status.HTTP_404_NOT_FOUND)
            content_type = mimetypes.guess_type(nome)[0] or 'application/octet-stream'
            if not content_type.startswith('image/'):
                return Response({'erro': 'URL não permitida'}, status=status.HTTP_400_BAD_REQUEST)
            with default_storage.open(nome, 'rb') as arquivo:
                return HttpResponse(arquivo.read(), content_type=content_type)

        if not _url_publica(url):
            return Response({'erro': 'URL não permitida'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = requests.get(url, stream=True, timeout=10, allow_redirects=False)
            content_type = response.headers.get('Content-Type', '')
            if response.status_code != 200 or not content_type.startswith('image/'):
                return Response({'erro': 'Falha ao buscar imagem'}, status=status.HTTP_400_BAD_REQUEST)

            conteudo = response.raw.read(PROXY_IMAGE_MAX_BYTES + 1, decode_content=True)
            if len(conteudo) > PROXY_IMAGE_MAX_BYTES:
                return Response({'erro': 'Imagem muito grande'}, status=status.HTTP_400_BAD_REQUEST)
            return HttpResponse(conteudo, content_type=content_type)
        except requests.RequestException:
            logger.exception('Erro no proxy de imagem')
            return Response({'erro': 'Erro ao buscar imagem'}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        """Retorna ou atualiza dados do usuário autenticado"""
        user = request.user

        if request.method == 'GET':
            serializer = UserDetailSerializer(user)
            return Response(serializer.data)

        data = request.data.copy()

        # Processamento de remoção de fundo (opcional, depende do rembg instalado)
        if _parse_bool(data.get('remove_bg'), False) and 'imagem_perfil' in data:
            try:
                import rembg
                from PIL import Image

                image_file = data['imagem_perfil']
                if hasattr(image_file, 'read'):
                    output_image = rembg.remove(Image.open(image_file))
                    buffer = BytesIO()
                    output_image.save(buffer, format='PNG')
                    file_name = image_file.name.rsplit('.', 1)[0] + '_nobg.png'
                    data['imagem_perfil'] = ContentFile(buffer.getvalue(), name=file_name)
            except Exception:
                # Continua sem remover fundo em caso de erro
                logger.exception('Erro ao remover fundo da imagem')

        serializer = UserSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Retorna estatísticas para o dashboard do usuário"""
        user = request.user

        rachas_count = _rachas_do_usuario(user).count()
        partidas_count = JogadorPartida.objects.filter(jogador=user, presente=True).count()

        stats = RegistroPartida.objects.aggregate(
            total_gols=Count('id', filter=Q(jogador_gol=user)),
            total_assistencias=Count('id', filter=Q(jogador_assistencia=user))
        )
        total_gols = stats['total_gols'] or 0
        total_assistencias = stats['total_assistencias'] or 0
        total_premios = PremioPartida.objects.filter(jogador=user).count()

        media_gols = 0
        media_assistencias = 0
        if partidas_count > 0:
            media_gols = round(total_gols / partidas_count, 2)
            media_assistencias = round(total_assistencias / partidas_count, 2)

        # Melhor companheiro (quem mais deu assistências para o usuário)
        melhor_garcom_id = RegistroPartida.objects.filter(
            jogador_gol=user,
            jogador_assistencia__isnull=False
        ).values('jogador_assistencia').annotate(
            count=Count('id')
        ).order_by('-count').first()

        melhor_garcom = None
        if melhor_garcom_id:
            garcom_user = User.objects.get(id=melhor_garcom_id['jogador_assistencia'])
            melhor_garcom = {
                'id': garcom_user.id,
                'nome': garcom_user.get_full_name() or garcom_user.username,
                'assistencias': melhor_garcom_id['count'],
                'imagem_perfil': get_image_url(garcom_user.imagem_perfil)
            }

        # Histórico das últimas partidas em que esteve presente (para o gráfico)
        presencas = (
            JogadorPartida.objects
            .filter(jogador=user, presente=True)
            .select_related('partida__racha')
            .order_by('-partida__data_inicio', '-partida__criado_em')[:12]
        )
        historico = []
        for presenca in reversed(list(presencas)):
            partida = presenca.partida
            historico.append({
                'partida_id': partida.id,
                'data': partida.data_inicio or partida.criado_em,
                'racha_nome': partida.racha.nome,
                'gols': RegistroPartida.objects.filter(partida=partida, jogador_gol=user).count(),
                'assistencias': RegistroPartida.objects.filter(partida=partida, jogador_assistencia=user).count(),
            })

        return Response({
            'id': user.id,
            'nome': user.get_full_name() or user.username,
            'username': user.username,
            'posicao': user.posicao,
            'imagem_perfil': get_image_url(user.imagem_perfil),
            'data_criacao': user.data_criacao,
            'rachas_count': rachas_count,
            'partidas_count': partidas_count,
            'gols': total_gols,
            'assistencias': total_assistencias,
            'premios': total_premios,
            'media_gols': media_gols,
            'media_assistencias': media_assistencias,
            'melhor_garcom': melhor_garcom,
            'historico': historico,
        })

    @action(detail=False, methods=['get'])
    def ranking_global(self, request):
        """Ranking global (gols + assistências) de todos os jogadores da plataforma"""
        users_stats = User.objects.annotate(
            total_gols=Count('gols_registrados', distinct=True),
            total_assistencias=Count('assistencias_registradas', distinct=True),
            total_presencas=Count('presencas_partida', filter=Q(presencas_partida__presente=True), distinct=True),
        )

        ranking = []
        for user in users_stats:
            # Ranking Global = Gols + Assistências (peso 1, justo entre rachas com regras diferentes)
            pontos = user.total_gols + user.total_assistencias
            if pontos > 0:
                ranking.append({
                    'jogador_id': user.id,
                    'jogador_nome': user.get_full_name() or user.username,
                    'jogador_username': user.username,
                    'jogador_imagem_perfil': get_image_url(user.imagem_perfil),
                    'posicao_campo': user.posicao,
                    'gols': user.total_gols,
                    'assistencias': user.total_assistencias,
                    'presencas': user.total_presencas,
                    'pontos': pontos
                })

        ranking.sort(key=lambda x: (x['pontos'], x['gols']), reverse=True)
        for idx, item in enumerate(ranking):
            item['posicao'] = idx + 1

        return Response(ranking)


class RachaViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar rachas"""

    serializer_class = RachaSerializer
    permission_classes = [IsAuthenticated, IsAdminRachaOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'codigo_convite']
    ordering_fields = ['criado_em', 'nome']
    ordering = ['-criado_em']

    def get_queryset(self):
        # Apenas rachas que o usuário participa ou administra (não vaza códigos de convite)
        return _rachas_do_usuario(self.request.user).order_by('-criado_em')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RachaDetailSerializer
        return RachaSerializer

    def perform_create(self, serializer):
        """Cria racha e define o usuário como administrador"""
        racha = serializer.save()
        racha.administrador.add(self.request.user)
        JogadoresRacha.objects.get_or_create(racha=racha, jogador=self.request.user)

    @action(detail=False, methods=['get'])
    def meus_rachas(self, request):
        """Lista rachas do usuário autenticado"""
        rachas = self.get_queryset()
        serializer = RachaSerializer(rachas, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def jogadores(self, request, pk=None):
        """Lista todos os jogadores do racha (ativos e inativos)"""
        racha = self.get_object()
        jogadores = racha.jogadores_racha.select_related('jogador').order_by('-ativo', 'jogador__first_name')
        serializer = JogadoresRachaSerializer(jogadores, many=True)
        return Response(serializer.data)

    def _exigir_admin(self, racha):
        if not is_admin_racha(self.request.user, racha):
            raise PermissionDenied('Apenas administradores podem realizar esta ação.')

    @action(detail=True, methods=['post'])
    def alterar_status_jogador(self, request, pk=None):
        """Altera o status ativo/inativo de um jogador"""
        racha = self.get_object()
        self._exigir_admin(racha)

        jogador_id = request.data.get('jogador_id')
        novo_status = _parse_bool(request.data.get('ativo'))

        if not jogador_id:
            return Response({'erro': 'jogador_id obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        if novo_status is None:
            return Response({'erro': 'ativo (boolean) obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        jogador_racha = get_object_or_404(JogadoresRacha, racha=racha, jogador_id=jogador_id)
        jogador_racha.ativo = novo_status
        jogador_racha.save(update_fields=['ativo'])

        return Response({'mensagem': f'Status alterado para {novo_status}', 'ativo': novo_status})

    @action(detail=True, methods=['delete'])
    def remover_jogador(self, request, pk=None):
        """Remove jogador do racha (apenas admin)"""
        racha = self.get_object()
        self._exigir_admin(racha)

        jogador_id = request.data.get('jogador_id')
        if not jogador_id:
            return Response({'erro': 'jogador_id obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        jogador_racha = get_object_or_404(JogadoresRacha, racha=racha, jogador_id=jogador_id)
        jogador_racha.ativo = False
        jogador_racha.save(update_fields=['ativo'])

        return Response({'mensagem': 'Jogador removido com sucesso'})

    @action(detail=True, methods=['get'])
    def ranking(self, request, pk=None):
        """Retorna ranking geral do racha"""
        racha = self.get_object()
        return self._calcular_ranking(racha)

    def _ranking_por_campo(self, racha, campo):
        jogadores = racha.jogadores_racha.filter(ativo=True).values_list('jogador_id', flat=True)
        totais = (
            RegistroPartida.objects
            .filter(partida__racha=racha, **{f'{campo}_id__in': jogadores})
            .values(f'{campo}_id')
            .annotate(total=Count('id'))
            .order_by('-total')
        )
        usuarios = User.objects.in_bulk([t[f'{campo}_id'] for t in totais])
        ranking = []
        for idx, item in enumerate(totais):
            jogador = usuarios[item[f'{campo}_id']]
            ranking.append({
                'jogador_id': jogador.id,
                'jogador_nome': jogador.get_full_name() or jogador.username,
                'jogador_username': jogador.username,
                'jogador_imagem_perfil': get_image_url(jogador.imagem_perfil) or '',
                'total': item['total'],
                'posicao': idx + 1,
            })
        return ranking

    @action(detail=True, methods=['get'])
    def ranking_artilheiros(self, request, pk=None):
        """Retorna ranking de artilharia"""
        racha = self.get_object()
        ranking = [{**r, 'gols': r['total']} for r in self._ranking_por_campo(racha, 'jogador_gol')]
        return Response(RankingArtilhariaSerializer(ranking, many=True).data)

    @action(detail=True, methods=['get'])
    def ranking_assistencias(self, request, pk=None):
        """Retorna ranking de assistências"""
        racha = self.get_object()
        ranking = [{**r, 'assistencias': r['total']} for r in self._ranking_por_campo(racha, 'jogador_assistencia')]
        return Response(RankingAssistenciasSerializer(ranking, many=True).data)

    @action(detail=True, methods=['get'])
    def estatisticas(self, request, pk=None):
        """Estatísticas agregadas do racha, por partida (alimenta os gráficos)"""
        racha = self.get_object()
        partidas = (
            racha.partidas
            .annotate(
                total_gols=Count('registros', filter=Q(registros__jogador_gol__isnull=False), distinct=True),
                total_assistencias=Count('registros', filter=Q(registros__jogador_assistencia__isnull=False),
                                         distinct=True),
                total_registros=Count('registros', distinct=True),
                total_presentes=Count('jogadores_presenca', filter=Q(jogadores_presenca__presente=True),
                                      distinct=True),
                total_premios=Count('premios_partida', distinct=True),
            )
            .order_by('data_inicio', 'criado_em')
        )

        por_partida = []
        for partida in partidas:
            por_partida.append({
                'partida_id': partida.id,
                'data': partida.data_inicio or partida.criado_em,
                'status': partida.status,
                'gols': partida.total_registros,
                'gols_identificados': partida.total_gols,
                'assistencias': partida.total_assistencias,
                'presentes': partida.total_presentes,
                'premios': partida.total_premios,
            })

        totais = {
            'partidas': len(por_partida),
            'gols': sum(p['gols'] for p in por_partida),
            'assistencias': sum(p['assistencias'] for p in por_partida),
            'premios': sum(p['premios'] for p in por_partida),
            'jogadores_ativos': racha.jogadores_racha.filter(ativo=True).count(),
        }
        totais['media_gols'] = round(totais['gols'] / totais['partidas'], 2) if totais['partidas'] else 0

        return Response({'totais': totais, 'por_partida': por_partida})

    def _calcular_ranking(self, racha):
        """Calcula ranking geral do racha (5 queries no total)"""
        jogadores_racha = racha.jogadores_racha.filter(ativo=True).select_related('jogador')
        jogadores_ids = [jr.jogador_id for jr in jogadores_racha]

        gols_map = dict(
            RegistroPartida.objects
            .filter(partida__racha=racha, jogador_gol_id__in=jogadores_ids)
            .values('jogador_gol_id')
            .annotate(total=Count('id'))
            .values_list('jogador_gol_id', 'total')
        )
        assistencias_map = dict(
            RegistroPartida.objects
            .filter(partida__racha=racha, jogador_assistencia_id__in=jogadores_ids)
            .values('jogador_assistencia_id')
            .annotate(total=Count('id'))
            .values_list('jogador_assistencia_id', 'total')
        )
        presencas_map = dict(
            JogadorPartida.objects
            .filter(partida__racha=racha, jogador_id__in=jogadores_ids, presente=True)
            .values('jogador_id')
            .annotate(total=Count('id'))
            .values_list('jogador_id', 'total')
        )
        premios_map = {
            row['jogador_id']: row
            for row in PremioPartida.objects
            .filter(partida__racha=racha, jogador_id__in=jogadores_ids)
            .values('jogador_id')
            .annotate(quantidade=Count('id'), pontos=Coalesce(Sum('premio__valor_pontos'), 0))
        }

        ranking = []
        for jr in jogadores_racha:
            jogador = jr.jogador
            jid = jogador.id

            gols = gols_map.get(jid, 0)
            assistencias = assistencias_map.get(jid, 0)
            presencas = presencas_map.get(jid, 0)
            premios = premios_map.get(jid, {})
            premios_pts = premios.get('pontos', 0)

            pontuacao_total = (
                gols * racha.ponto_gol +
                assistencias * racha.ponto_assistencia +
                presencas * racha.ponto_presenca +
                premios_pts
            )

            ranking.append({
                'jogador_id': jid,
                'jogador_nome': jogador.get_full_name() or jogador.username,
                'jogador_username': jogador.username,
                'jogador_imagem_perfil': get_image_url(jogador.imagem_perfil) or '',
                'posicao': jogador.posicao or '',
                'gols': gols,
                'assistencias': assistencias,
                'presencas': presencas,
                'premios': premios.get('quantidade', 0),
                'premios_pontos': premios_pts,
                'pontuacao_total': pontuacao_total,
            })

        ranking.sort(key=lambda x: (x['pontuacao_total'], x['gols'], x['assistencias']), reverse=True)

        serializer = RankingJogadorSerializer(ranking, many=True)
        return Response(serializer.data)


class PremioViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar prêmios"""

    serializer_class = PremioSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome']

    def get_queryset(self):
        # Jogadores veem os prêmios dos seus rachas; só admins alteram
        queryset = Premio.objects.filter(racha__in=_rachas_do_usuario(self.request.user))
        racha_id = self.request.query_params.get('racha')
        if racha_id:
            queryset = queryset.filter(racha_id=racha_id)
        return queryset

    def _exigir_admin(self, racha):
        if not is_admin_racha(self.request.user, racha):
            raise PermissionDenied('Você não é administrador deste racha.')

    def perform_create(self, serializer):
        self._exigir_admin(serializer.validated_data['racha'])
        serializer.save()

    def perform_update(self, serializer):
        self._exigir_admin(serializer.instance.racha)
        if 'racha' in serializer.validated_data:
            self._exigir_admin(serializer.validated_data['racha'])
        serializer.save()

    def perform_destroy(self, instance):
        self._exigir_admin(instance.racha)
        instance.delete()


class PartidaViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar partidas"""

    serializer_class = PartidaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['criado_em', 'data_inicio']
    ordering = ['-criado_em']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PartidaDetailSerializer
        return PartidaSerializer

    def get_queryset(self):
        queryset = Partida.objects.filter(racha__in=_rachas_do_usuario(self.request.user)).select_related('racha')
        racha_id = self.request.query_params.get('racha')
        if racha_id:
            queryset = queryset.filter(racha_id=racha_id)
        return queryset

    def _exigir_admin(self, partida_ou_racha):
        racha = partida_ou_racha.racha if isinstance(partida_ou_racha, Partida) else partida_ou_racha
        if not is_admin_racha(self.request.user, racha):
            raise PermissionDenied('Apenas o administrador do racha pode gerenciar a partida.')

    def _membro_ativo(self, partida, jogador_id, campo):
        """Busca um jogador garantindo que ele pertence ao racha da partida."""
        if not jogador_id:
            return None
        jogador = get_object_or_404(User, id=jogador_id)
        if not JogadoresRacha.objects.filter(racha=partida.racha, jogador=jogador).exists():
            raise ValidationError({campo: 'Jogador não pertence a este racha.'})
        return jogador

    def perform_create(self, serializer):
        self._exigir_admin(serializer.validated_data['racha'])
        serializer.save()

    def perform_update(self, serializer):
        self._exigir_admin(serializer.instance)
        if 'racha' in serializer.validated_data:
            self._exigir_admin(serializer.validated_data['racha'])
        serializer.save()

    def perform_destroy(self, instance):
        self._exigir_admin(instance)
        instance.delete()

    @action(detail=True, methods=['get'])
    def jogadores(self, request, pk=None):
        """Lista jogadores presentes na partida"""
        partida = self.get_object()
        jogadores = JogadorPartida.objects.filter(partida=partida, presente=True).select_related('jogador')
        serializer = JogadorPartidaSerializer(jogadores, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adicionar_jogador(self, request, pk=None):
        """Adiciona um ou vários jogadores à partida"""
        partida = self.get_object()
        self._exigir_admin(partida)

        if 'jogadores_ids' in request.data:
            jogadores_ids = request.data.get('jogadores_ids', [])
            if not isinstance(jogadores_ids, list):
                return Response(
                    {'erro': 'jogadores_ids deve ser uma lista'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            jogadores_adicionados = []
            erros = []

            for j_id in jogadores_ids:
                jogador = User.objects.filter(id=j_id).first()
                if not jogador:
                    erros.append(f'Jogador {j_id} não encontrado')
                    continue
                if not JogadoresRacha.objects.filter(racha=partida.racha, jogador=jogador, ativo=True).exists():
                    erros.append(f"Jogador {jogador.get_full_name() or jogador.username} não pertence a este racha")
                    continue

                jogador_partida, _ = JogadorPartida.objects.update_or_create(
                    partida=partida,
                    jogador=jogador,
                    defaults={'presente': True}
                )
                jogadores_adicionados.append(JogadorPartidaSerializer(jogador_partida).data)

            return Response({
                'jogadores': jogadores_adicionados,
                'erros': erros
            })

        jogador_id = request.data.get('jogador_id')
        if not jogador_id:
            return Response(
                {'erro': 'jogador_id ou jogadores_ids obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        jogador = get_object_or_404(User, id=jogador_id)
        if not JogadoresRacha.objects.filter(racha=partida.racha, jogador=jogador, ativo=True).exists():
            return Response(
                {'erro': 'Jogador não pertence a este racha'},
                status=status.HTTP_400_BAD_REQUEST
            )

        jogador_partida, _ = JogadorPartida.objects.update_or_create(
            partida=partida,
            jogador=jogador,
            defaults={'presente': True}
        )
        return Response(JogadorPartidaSerializer(jogador_partida).data)

    @action(detail=True, methods=['post'])
    def registrar_presenca(self, request, pk=None):
        """Marca presença/ausência de um jogador na partida"""
        partida = self.get_object()
        self._exigir_admin(partida)

        jogador = self._membro_ativo(partida, request.data.get('jogador_id'), 'jogador_id')
        if not jogador:
            return Response({'erro': 'jogador_id obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        presente = _parse_bool(request.data.get('presente'), True)

        presenca, _ = JogadorPartida.objects.update_or_create(
            partida=partida,
            jogador=jogador,
            defaults={'presente': presente}
        )
        return Response(JogadorPartidaSerializer(presenca).data)

    def _validar_lance(self, jogador_gol, jogador_assistencia):
        # Autor nulo = gol não identificado (convidado, gol contra...): conta no placar, não no ranking
        if jogador_gol and jogador_assistencia and jogador_gol.id == jogador_assistencia.id:
            raise ValidationError({'erro': 'O autor do gol não pode dar a própria assistência'})

    @action(detail=True, methods=['post'])
    def registrar_gol(self, request, pk=None):
        """Registra gol e assistência na partida"""
        partida = self.get_object()
        self._exigir_admin(partida)

        jogador_gol = self._membro_ativo(partida, request.data.get('jogador_gol_id'), 'jogador_gol_id')
        jogador_assistencia = self._membro_ativo(
            partida, request.data.get('jogador_assistencia_id'), 'jogador_assistencia_id')
        self._validar_lance(jogador_gol, jogador_assistencia)

        registro = RegistroPartida.objects.create(
            partida=partida,
            jogador_gol=jogador_gol,
            jogador_assistencia=jogador_assistencia
        )
        return Response(RegistroPartidaSerializer(registro).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def remover_registro(self, request, pk=None):
        """Remove um registro de gol/assistência da partida"""
        partida = self.get_object()
        self._exigir_admin(partida)

        registro_id = request.data.get('registro_id')
        if not registro_id:
            return Response({'erro': 'registro_id obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        registro = get_object_or_404(RegistroPartida, id=registro_id, partida=partida)
        registro.delete()
        return Response({'mensagem': 'Registro removido com sucesso'})

    @action(detail=True, methods=['put'])
    def editar_registro(self, request, pk=None):
        """Edita um registro de gol/assistência (null = anônimo / sem assistência)"""
        partida = self.get_object()
        self._exigir_admin(partida)

        registro_id = request.data.get('registro_id')
        if not registro_id:
            return Response({'erro': 'registro_id obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        registro = get_object_or_404(RegistroPartida, id=registro_id, partida=partida)

        if 'jogador_gol_id' in request.data:
            registro.jogador_gol = self._membro_ativo(partida, request.data.get('jogador_gol_id'), 'jogador_gol_id')
        if 'jogador_assistencia_id' in request.data:
            registro.jogador_assistencia = self._membro_ativo(
                partida, request.data.get('jogador_assistencia_id'), 'jogador_assistencia_id')
        self._validar_lance(registro.jogador_gol, registro.jogador_assistencia)

        registro.save()
        return Response(RegistroPartidaSerializer(registro).data)

    @action(detail=True, methods=['post'])
    def associar_premio(self, request, pk=None):
        """Associa um prêmio a um jogador na partida"""
        partida = self.get_object()
        self._exigir_admin(partida)

        jogador_id = request.data.get('jogador_id')
        premio_id = request.data.get('premio_id')
        if not jogador_id or not premio_id:
            return Response(
                {'erro': 'jogador_id e premio_id são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        jogador = self._membro_ativo(partida, jogador_id, 'jogador_id')
        premio = get_object_or_404(Premio, id=premio_id)
        if premio.racha_id != partida.racha_id:
            return Response(
                {'erro': 'O prêmio não pertence ao racha desta partida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        premio_partida = PremioPartida.objects.create(partida=partida, jogador=jogador, premio=premio)
        return Response({
            'mensagem': f'Prêmio {premio.nome} associado a {jogador.first_name or jogador.username}',
            'id': premio_partida.id
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def remover_premio(self, request, pk=None):
        """Remove a associação de prêmio de uma partida"""
        partida = self.get_object()
        self._exigir_admin(partida)

        premio_partida_id = request.data.get('premio_partida_id')
        if not premio_partida_id:
            return Response({'erro': 'premio_partida_id obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        premio_partida = get_object_or_404(PremioPartida, id=premio_partida_id, partida=partida)
        premio_partida.delete()
        return Response({'mensagem': 'Prêmio removido com sucesso'})

    @action(detail=True, methods=['put'])
    def editar_premio(self, request, pk=None):
        """Edita o jogador ou prêmio de uma associação PremioPartida"""
        partida = self.get_object()
        self._exigir_admin(partida)

        premio_partida_id = request.data.get('premio_partida_id')
        if not premio_partida_id:
            return Response({'erro': 'premio_partida_id obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        premio_partida = get_object_or_404(PremioPartida, id=premio_partida_id, partida=partida)

        jogador_id = request.data.get('jogador_id')
        premio_id = request.data.get('premio_id')

        if jogador_id:
            premio_partida.jogador = self._membro_ativo(partida, jogador_id, 'jogador_id')
        if premio_id:
            novo_premio = get_object_or_404(Premio, id=premio_id)
            if novo_premio.racha_id != partida.racha_id:
                return Response(
                    {'erro': 'O prêmio não pertence ao racha desta partida'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            premio_partida.premio = novo_premio

        premio_partida.save()
        return Response(PremioPartidaSerializer(premio_partida).data)

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        """Finaliza a partida"""
        partida = self.get_object()
        self._exigir_admin(partida)

        partida.data_fim = timezone.now()
        partida.status = False
        partida.save(update_fields=['data_fim', 'status'])

        serializer = PartidaDetailSerializer(partida, context=self.get_serializer_context())
        return Response(serializer.data)


class SolicitacaoRachaViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar solicitações de entrada em racha"""

    serializer_class = SolicitacaoRachaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    # Status só muda pelas ações aprovar/negar
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends = [filters.OrderingFilter]
    ordering = ['-criado_em']

    def create(self, request, *args, **kwargs):
        """Cria nova solicitação de entrada em racha"""
        codigo_convite = str(request.data.get('codigo_convite') or '').strip().upper()

        if not codigo_convite:
            return Response(
                {'erro': 'codigo_convite obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        racha = get_object_or_404(Racha, codigo_convite=codigo_convite)

        if JogadoresRacha.objects.filter(racha=racha, jogador=request.user, ativo=True).exists():
            return Response(
                {'erro': 'Você já é membro deste racha'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if SolicitacaoRacha.objects.filter(racha=racha, jogador=request.user, status='PENDENTE').exists():
            return Response(
                {'erro': 'Você já tem uma solicitação pendente para este racha'},
                status=status.HTTP_400_BAD_REQUEST
            )

        solicitacao = SolicitacaoRacha.objects.create(
            racha=racha,
            jogador=request.user,
            status='PENDENTE'
        )

        serializer = SolicitacaoRachaSerializer(solicitacao, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        tipo = self.request.query_params.get('tipo', 'recebidas')
        queryset = SolicitacaoRacha.objects.select_related('racha', 'jogador')

        if tipo == 'enviadas':
            return queryset.filter(jogador=self.request.user)
        # Padrão: solicitações dos rachas que o usuário administra (recebidas)
        return queryset.filter(racha__administrador=self.request.user).distinct()

    def _solicitacao_pendente_do_admin(self, pk):
        solicitacao = get_object_or_404(
            SolicitacaoRacha.objects.select_related('racha', 'jogador'), pk=pk
        )
        if not is_admin_racha(self.request.user, solicitacao.racha):
            raise PermissionDenied('Apenas o admin pode responder solicitações')
        if solicitacao.status != 'PENDENTE':
            raise ValidationError({'erro': 'Esta solicitação já foi respondida'})
        return solicitacao

    @action(detail=True, methods=['post'])
    def aprovar(self, request, pk=None):
        """Aprova solicitação de entrada"""
        solicitacao = self._solicitacao_pendente_do_admin(pk)

        # Adiciona (ou reativa) o jogador no racha
        JogadoresRacha.objects.update_or_create(
            racha=solicitacao.racha,
            jogador=solicitacao.jogador,
            defaults={'ativo': True},
        )
        solicitacao.status = 'ACEITO'
        solicitacao.save(update_fields=['status'])

        return Response(SolicitacaoRachaSerializer(solicitacao, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'])
    def negar(self, request, pk=None):
        """Nega solicitação de entrada"""
        solicitacao = self._solicitacao_pendente_do_admin(pk)
        solicitacao.status = 'NEGADO'
        solicitacao.save(update_fields=['status'])

        return Response(SolicitacaoRachaSerializer(solicitacao, context=self.get_serializer_context()).data)
