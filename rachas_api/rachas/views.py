from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import timedelta
import rembg
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile

from .models import (
    User, Racha, JogadoresRacha, Premio, Partida,
    JogadorPartida, RegistroPartida, PremioPartida, SolicitacaoRacha
)
from .serializers import (
    UserSerializer, UserDetailSerializer, RachaSerializer, RachaDetailSerializer,
    JogadoresRachaSerializer, PremioSerializer, PartidaSerializer, PartidaDetailSerializer,
    JogadorPartidaSerializer, RegistroPartidaSerializer, PremioPartidaSerializer,
    SolicitacaoRachaSerializer, RankingJogadorSerializer, RankingArtilhariaSerializer,
    RankingAssistenciasSerializer, get_image_url
)
from .permissions import IsAdminRacha, IsJogadorRacha, IsAdminRachaOrReadOnly


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar usuários/jogadores"""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    # permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    def create(self, request, *args, **kwargs):
        """Cria novo usuário"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        password = request.data.get('password')
        if password:
            user = User.objects.get(id=serializer.data['id'])
            user.set_password(password)
            user.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        """Retorna ou atualiza dados do usuário autenticado"""
        user = request.user
        
        if request.method == 'GET':
            serializer = UserDetailSerializer(user)
            return Response(serializer.data)
        
        
        print(request.data)
        
        # Para PUT e PATCH
        data = request.data.copy() # Make mutable copy
        
        # Processamento de remoção de fundo
        if 'remove_bg' in data and data.get('remove_bg') == 'true' and 'imagem_perfil' in data:
            try:
                image_file = data['imagem_perfil']
                if hasattr(image_file, 'read'): # Check if it's a file
                    input_image = Image.open(image_file)
                    
                    # Remover fundo
                    output_image = rembg.remove(input_image)
                    
                    # Salvar em buffer
                    buffer = BytesIO()
                    output_image.save(buffer, format='PNG')
                    
                    # Criar novo arquivo Django
                    file_name = image_file.name.split('.')[0] + '_nobg.png'
                    data['imagem_perfil'] = ContentFile(buffer.getvalue(), name=file_name)
            except Exception as e:
                print(f"Erro ao remover fundo: {e}")
                # Continua sem remover fundo em caso de erro

        serializer = UserSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard(self, request):
        """Retorna estatísticas para o dashboard do usuário"""
        user = request.user
        
        # 1. Quantidade de rachas (admin ou jogador)
        rachas_count = Racha.objects.filter(
            Q(administrador=user) | Q(jogadores_racha__jogador=user)
        ).distinct().count()
        
        # 2. Quantidade de partidas (presente)
        partidas_count = JogadorPartida.objects.filter(
            jogador=user,
            presente=True
        ).count()
        
        # 3. Gols e Assistências totais
        stats = RegistroPartida.objects.aggregate(
            total_gols=Count('id', filter=Q(jogador_gol=user)),
            total_assistencias=Count('id', filter=Q(jogador_assistencia=user))
        )
        total_gols = stats['total_gols'] or 0
        total_assistencias = stats['total_assistencias'] or 0
        
        # 4. Médias
        media_gols = 0
        media_assistencias = 0
        if partidas_count > 0:
            media_gols = round(total_gols / partidas_count, 2)
            media_assistencias = round(total_assistencias / partidas_count, 2)
            
        # 5. Melhor companheiro (quem mais deu assistências para o usuário)
        # Buscar quem deu assistência para gols do usuário
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
                'nome': garcom_user.get_full_name(),
                'assistencias': melhor_garcom_id['count'],
                'imagem_perfil': get_image_url(garcom_user.imagem_perfil)
            }
            
        # Dados do usuário
        user_data = {
            'id': user.id,
            'nome': user.get_full_name(),
            'posicao': user.posicao,
            'imagem_perfil': get_image_url(user.imagem_perfil),
            'rachas_count': rachas_count,
            'partidas_count': partidas_count,
            'gols': total_gols,
            'assistencias': total_assistencias,
            'media_gols': media_gols,
            'media_assistencias': media_assistencias,
            'melhor_garcom': melhor_garcom
        }
        
        return Response(user_data)

    @action(detail=False, methods=['get'])
    def ranking_global(self, request):
        """Retorna ranking global de todos os jogadores da plataforma"""
        
        ranking = []
        users = User.objects.all()
        
        # Otimização: Fazer query agregada seria melhor, mas para manter consistência 
        # com a estrutura atual e garantir flexibilidade, faremos processamento similar
        # mas buscando de todos os registros
        
        users_stats = User.objects.annotate(
            total_gols=Count('gols_registrados', distinct=True),
            total_assistencias=Count('assistencias_registradas', distinct=True)
        )
        
        for user in users_stats:
            # Calcular pontos (considerando peso padrão 1 para simplificar o global, 
            # ou poderíamos somar os pontos baseados nas regras de cada racha, mas
            # globalmente faz mais sentido G=1, A=1 para ser justo entre rachas diferentes)
            # Decisão: Ranking Global = Gols + Assistências
            
            pontos = user.total_gols + user.total_assistencias
            
            if pontos > 0: # Mostrar apenas quem tem pontuação
                ranking.append({
                    'jogador_id': user.id,
                    'jogador_nome': user.get_full_name() or user.username,
                    'jogador_imagem_perfil': get_image_url(user.imagem_perfil),
                    'posicao_campo': user.posicao,
                    'gols': user.total_gols,
                    'assistencias': user.total_assistencias,
                    'pontos': pontos
                })
        
        # Ordenar por pontos (desc), depois gols (desc)
        ranking.sort(key=lambda x: (x['pontos'], x['gols']), reverse=True)
        
        # Adicionar posição no ranking
        for idx, item in enumerate(ranking):
            item['posicao'] = idx + 1
            
        return Response(ranking)


class RachaViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar rachas"""
    
    queryset = Racha.objects.all()
    serializer_class = RachaSerializer
    permission_classes = [IsAuthenticated, IsAdminRachaOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'codigo_convite']
    ordering_fields = ['criado_em', 'nome']
    ordering = ['-criado_em']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RachaDetailSerializer
        return RachaSerializer
    
    def perform_create(self, serializer):
        """Cria racha e define o usuário como administrador"""
        racha = serializer.save()
        racha.administrador.add(self.request.user)
        # Adiciona o criador como jogador
        JogadoresRacha.objects.create(racha=racha, jogador=self.request.user)
    
    @action(detail=False, methods=['get'])
    def meus_rachas(self, request):
        """Lista rachas do usuário autenticado"""
        rachas = Racha.objects.filter(
            Q(administrador__id=request.user.id) |
            Q(jogadores_racha__jogador=request.user)
        ).distinct()
        serializer = RachaSerializer(rachas, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def entrar_por_codigo(self, request, pk=None):
        """Permite jogador entrar em racha usando código de convite"""
        codigo = request.data.get('codigo_convite')
        
        if not codigo:
            return Response(
                {'erro': 'Código de convite obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        racha = get_object_or_404(Racha, codigo_convite=codigo)
        
        # Verifica se já é membro
        if JogadoresRacha.objects.filter(racha=racha, jogador=request.user).exists():
            return Response(
                {'erro': 'Você já é membro deste racha'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cria solicitação
        solicitacao, created = SolicitacaoRacha.objects.get_or_create(
            racha=racha,
            jogador=request.user,
            defaults={'status': 'PENDENTE'}
        )
        
        if not created:
            return Response(
                {'mensagem': 'Você já tem uma solicitação pendente'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SolicitacaoRachaSerializer(solicitacao)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def jogadores(self, request, pk=None):
        """Lista jogadores do racha"""
        racha = self.get_object()
        jogadores = racha.jogadores_racha.filter(ativo=True)
        serializer = JogadoresRachaSerializer(jogadores, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'])
    def remover_jogador(self, request, pk=None):
        """Remove jogador do racha (apenas admin)"""
        racha = self.get_object()
        self.check_object_permissions(request, racha)
        
        jogador_id = request.data.get('jogador_id')
        if not jogador_id:
            return Response(
                {'erro': 'jogador_id obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        jogador_racha = get_object_or_404(
            JogadoresRacha,
            racha=racha,
            jogador_id=jogador_id
        )
        jogador_racha.ativo = False
        jogador_racha.save()
        
        return Response({'mensagem': 'Jogador removido com sucesso'})
    
    @action(detail=True, methods=['get'])
    def ranking(self, request, pk=None):
        """Retorna ranking geral do racha"""
        racha = self.get_object()
        return self._calcular_ranking(racha, request)
    
    @action(detail=True, methods=['get'])
    def ranking_artilheiros(self, request, pk=None):
        """Retorna ranking de artilharia"""
        racha = self.get_object()
        jogadores = racha.jogadores_racha.filter(ativo=True).values_list('jogador_id', flat=True)
        
        ranking = []
        for idx, jogador_id in enumerate(
            RegistroPartida.objects.filter(
                partida__racha=racha,
                jogador_gol_id__in=jogadores
            ).values('jogador_gol_id').annotate(
                gols=Count('id')
            ).order_by('-gols').values_list('jogador_gol_id', flat=True)
        ):
            jogador = User.objects.get(id=jogador_id)
            gols = RegistroPartida.objects.filter(
                partida__racha=racha,
                jogador_gol_id=jogador_id
            ).count()
            
            ranking.append({
                'jogador_id': jogador_id,
                'jogador_nome': jogador.get_full_name(),
                'jogador_imagem_perfil': get_image_url(jogador.imagem_perfil) or '',
                'gols': gols,
                'posicao': idx + 1
            })
        
        serializer = RankingArtilhariaSerializer(ranking, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def ranking_assistencias(self, request, pk=None):
        """Retorna ranking de assistências"""
        racha = self.get_object()
        jogadores = racha.jogadores_racha.filter(ativo=True).values_list('jogador_id', flat=True)
        
        ranking = []
        for idx, jogador_id in enumerate(
            RegistroPartida.objects.filter(
                partida__racha=racha,
                jogador_assistencia_id__in=jogadores
            ).exclude(jogador_assistencia_id__isnull=True).values(
                'jogador_assistencia_id'
            ).annotate(
                assistencias=Count('id')
            ).order_by('-assistencias').values_list('jogador_assistencia_id', flat=True)
        ):
            jogador = User.objects.get(id=jogador_id)
            assistencias = RegistroPartida.objects.filter(
                partida__racha=racha,
                jogador_assistencia_id=jogador_id
            ).count()
            
            ranking.append({
                'jogador_id': jogador_id,
                'jogador_nome': jogador.get_full_name(),
                'jogador_imagem_perfil': get_image_url(jogador.imagem_perfil) or '',
                'assistencias': assistencias,
                'posicao': idx + 1
            })
        
        serializer = RankingAssistenciasSerializer(ranking, many=True)
        return Response(serializer.data)
    
    def _calcular_ranking(self, racha, request):
        """Calcula ranking geral do racha"""
        jogadores = racha.jogadores_racha.filter(ativo=True)
        ranking = []
        
        for jogador_racha in jogadores:
            jogador = jogador_racha.jogador
            
            # Contar gols
            gols = RegistroPartida.objects.filter(
                partida__racha=racha,
                jogador_gol=jogador
            ).count()
            
            # Contar assistências
            assistencias = RegistroPartida.objects.filter(
                partida__racha=racha,
                jogador_assistencia=jogador
            ).count()
            
            # Contar presenças
            presencas = JogadorPartida.objects.filter(
                partida__racha=racha,
                jogador=jogador,
                presente=True
            ).count()
            
            # Somar prêmios
            premios_pontos = PremioPartida.objects.filter(
                partida__racha=racha,
                jogador=jogador
            ).aggregate(total=Sum('premio__valor_pontos'))['total'] or 0
            
            # Calcular pontuação total
            pontuacao_total = (
                gols * racha.ponto_gol +
                assistencias * racha.ponto_assistencia +
                presencas * racha.ponto_presenca +
                premios_pontos
            )
            
            ranking.append({
                'jogador_id': jogador.id,
                'jogador_nome': jogador.get_full_name(),
                'jogador_imagem_perfil': get_image_url(jogador.imagem_perfil) or '',
                'posicao': jogador.posicao,
                'gols': gols,
                'assistencias': assistencias,
                'presencas': presencas,
                'premios_pontos': premios_pontos,
                'pontuacao_total': pontuacao_total
            })
        
        # Ordenar por pontuação
        ranking.sort(key=lambda x: x['pontuacao_total'], reverse=True)
        
        serializer = RankingJogadorSerializer(ranking, many=True)
        return Response(serializer.data)


class PremioViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar prêmios"""
    
    queryset = Premio.objects.all()
    serializer_class = PremioSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome']
    
    def get_queryset(self):
        # Filtrar prêmios dos rachas do usuário
        queryset = Premio.objects.filter(
            racha__administrador=self.request.user
        )
        racha_id = self.request.query_params.get('racha')
        if racha_id:
            queryset = queryset.filter(racha_id=racha_id)
        return queryset
    
    def perform_create(self, serializer):
        """Cria prêmio apenas se usuário é admin do racha"""
        racha_id = self.request.data.get('racha')
        racha = get_object_or_404(Racha, id=racha_id)
        
        if racha.administrador != self.request.user:
            raise PermissionError("Você não é administrador deste racha")
        
        serializer.save()


class PartidaViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar partidas"""
    
    queryset = Partida.objects.all()
    serializer_class = PartidaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['criado_em', 'data_inicio']
    ordering = ['-criado_em']
    
    def create(self, request, *args, **kwargs):
        """Cria nova partida"""
        return super().create(request, *args, **kwargs)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PartidaDetailSerializer
        return PartidaSerializer
    
    def get_queryset(self):
        # Filtrar partidas dos rachas do usuário
        return Partida.objects.filter(
            racha__jogadores_racha__jogador=self.request.user
        ).distinct()
    
    def perform_create(self, serializer):
        """Cria partida apenas se usuário é admin do racha"""
        racha_id = self.request.data.get('racha')
        racha = get_object_or_404(Racha, id=racha_id)
        
        if racha.administrador != self.request.user:
            raise PermissionError("Você não é administrador deste racha")
        
        serializer.save()
    
    @action(detail=True, methods=['get'])
    def jogadores(self, request, pk=None):
        """Lista jogadores presentes na partida"""
        partida = self.get_object()
        jogadores = JogadorPartida.objects.filter(partida=partida, presente=True)
        serializer = JogadorPartidaSerializer(jogadores, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adicionar_jogador(self, request, pk=None):
        """Adiciona jogador à partida"""
        partida = self.get_object()
        jogador_id = request.data.get('jogador_id')
        time = request.data.get('time', 'A')
        
        if not jogador_id:
            return Response(
                {'erro': 'jogador_id obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        jogador = get_object_or_404(User, id=jogador_id)
        
        # Verifica se jogador pertence ao racha
        if not JogadoresRacha.objects.filter(racha=partida.racha, jogador=jogador, ativo=True).exists():
             return Response(
                {'erro': 'Jogador não pertence a este racha'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        jogador_partida, created = JogadorPartida.objects.update_or_create(
            partida=partida,
            jogador=jogador,
            defaults={'presente': True}
        )
        
        serializer = JogadorPartidaSerializer(jogador_partida)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def registrar_presenca(self, request, pk=None):
        """Registra presença de jogador na partida"""
        partida = self.get_object()
        jogador_id = request.data.get('jogador_id')
        presente = request.data.get('presente', True)
        
        if not jogador_id:
            return Response(
                {'erro': 'jogador_id obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        jogador = get_object_or_404(User, id=jogador_id)
        
        presenca, created = JogadorPartida.objects.update_or_create(
            partida=partida,
            jogador=jogador,
            defaults={'presente': presente}
        )
        
    @action(detail=True, methods=['post'])
    def registrar_gol(self, request, pk=None):
        """Registra gol e assistência na partida"""
        partida = self.get_object()
        
        jogador_gol_id = request.data.get('jogador_gol_id')
        jogador_assistencia_id = request.data.get('jogador_assistencia_id')
        
        if not jogador_gol_id:
            return Response(
                {'erro': 'jogador_gol_id obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar jogador gol
        jogador_gol = get_object_or_404(User, id=jogador_gol_id)
        
        # Validar jogador assistência (opcional)
        jogador_assistencia = None
        if jogador_assistencia_id:
            jogador_assistencia = get_object_or_404(User, id=jogador_assistencia_id)
        
        registro = RegistroPartida.objects.create(
            partida=partida,
            jogador_gol=jogador_gol,
            jogador_assistencia=jogador_assistencia
        )
        
        serializer = RegistroPartidaSerializer(registro)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def remover_registro(self, request, pk=None):
        """Remove um registro de gol/assistência da partida"""
        partida = self.get_object()
        registro_id = request.data.get('registro_id')
        
        if not registro_id:
            return Response(
                {'erro': 'registro_id obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        registro = get_object_or_404(RegistroPartida, id=registro_id, partida=partida)
        registro.delete()
        
        return Response({'mensagem': 'Registro removido com sucesso'})

    @action(detail=True, methods=['post'])
    def associar_premio(self, request, pk=None):
        """Associa um prêmio a um jogador na partida"""
        partida = self.get_object()
        jogador_id = request.data.get('jogador_id')
        premio_id = request.data.get('premio_id')

        if not jogador_id or not premio_id:
            return Response(
                {'erro': 'jogador_id e premio_id são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        jogador = get_object_or_404(User, id=jogador_id)
        premio = get_object_or_404(Premio, id=premio_id)

        # Validar se o prêmio pertence ao racha da partida
        if premio.racha != partida.racha:
             return Response(
                {'erro': 'O prêmio não pertence ao racha desta partida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Criar a associação
        premio_partida = PremioPartida.objects.create(
            partida=partida,
            jogador=jogador,
            premio=premio
        )

        return Response({
            'mensagem': f'Prêmio {premio.nome} associado a {jogador.first_name}',
            'id': premio_partida.id
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put'])
    def editar_registro(self, request, pk=None):
        """Edita um registro de gol/assistência"""
        partida = self.get_object()
        registro_id = request.data.get('registro_id')
        jogador_gol_id = request.data.get('jogador_gol_id')
        jogador_assistencia_id = request.data.get('jogador_assistencia_id')
        
        if not registro_id:
            return Response(
                {'erro': 'registro_id obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        registro = get_object_or_404(RegistroPartida, id=registro_id, partida=partida)
        
        if jogador_gol_id:
            registro.jogador_gol = get_object_or_404(User, id=jogador_gol_id)
            
        # Assistência pode ser removida se enviar null ou alterada se enviar ID
        if 'jogador_assistencia_id' in request.data:
            if jogador_assistencia_id:
                registro.jogador_assistencia = get_object_or_404(User, id=jogador_assistencia_id)
            else:
                registro.jogador_assistencia = None
                
        registro.save()
        serializer = RegistroPartidaSerializer(registro)
        return Response(serializer.data) @action(detail=True, methods=['post'])
    def registrar_premio(self, request, pk=None):
        """Registra prêmio para jogador na partida"""
        partida = self.get_object()
        premio_id = request.data.get('premio_id')
        jogador_id = request.data.get('jogador_id')
        
        if not premio_id or not jogador_id:
            return Response(
                {'erro': 'premio_id e jogador_id obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        premio = get_object_or_404(Premio, id=premio_id)
        jogador = get_object_or_404(User, id=jogador_id)
        
        premio_partida = PremioPartida.objects.create(
            partida=partida,
            premio=premio,
            jogador=jogador
        )
        
        serializer = PremioPartidaSerializer(premio_partida)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        """Finaliza a partida"""
        partida = self.get_object()
        
        if request.user not in partida.racha.administrador.all() :
            return Response(
                {'erro': 'Apenas o admin pode finalizar a partida'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        partida.data_fim = timezone.now()
        partida.status = False
        partida.save()
        
        serializer = PartidaDetailSerializer(partida)
        return Response(serializer.data)


class SolicitacaoRachaViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar solicitações de entrada em racha"""
    
    queryset = SolicitacaoRacha.objects.all()
    serializer_class = SolicitacaoRachaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-criado_em']
    
    def create(self, request, *args, **kwargs):
        """Cria nova solicitação de entrada em racha"""
        codigo_convite = request.data.get('codigo_convite')
        
        if not codigo_convite:
            return Response(
                {'erro': 'codigo_convite obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        racha = get_object_or_404(Racha, codigo_convite=codigo_convite)
        
        # Verifica se já é membro
        if JogadoresRacha.objects.filter(racha=racha, jogador=request.user).exists():
            return Response(
                {'erro': 'Você já é membro deste racha'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verifica se já existe solicitação pendente
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
        
        serializer = SolicitacaoRachaSerializer(solicitacao)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def get_queryset(self):
        # Filtrar solicitações dos rachas que o usuário administra
        return SolicitacaoRacha.objects.filter(
            racha__administrador=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def aprovar(self, request, pk=None):
        """Aprova solicitação de entrada"""
        solicitacao = self.get_object()
        
        if request.user not in solicitacao.racha.administrador.all() :
            return Response(
                {'erro': 'Apenas o admin pode aprovar solicitações'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Adiciona jogador ao racha
        JogadoresRacha.objects.get_or_create(
            racha=solicitacao.racha,
            jogador=solicitacao.jogador
        )
        
        # Atualiza status
        solicitacao.status = 'ACEITO'
        solicitacao.save()
        
        serializer = SolicitacaoRachaSerializer(solicitacao)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def negar(self, request, pk=None):
        """Nega solicitação de entrada"""
        solicitacao = self.get_object()
        
        if request.user not in solicitacao.racha.administrador.all():
            return Response(
                {'erro': 'Apenas o admin pode negar solicitações'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        solicitacao.status = 'NEGADO'
        solicitacao.save()
        
        serializer = SolicitacaoRachaSerializer(solicitacao)
        return Response(serializer.data)
