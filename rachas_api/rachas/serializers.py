from rest_framework import serializers
from django.db.models import Sum, Count, Q
from django.conf import settings
from .models import (
    User, Racha, JogadoresRacha, Premio, Partida, 
    JogadorPartida, RegistroPartida, PremioPartida, SolicitacaoRacha
)


def get_image_url(image_field):
    """Helper para obter URL completa de imagens"""
    if not image_field:
        return None
    try:
        url = image_field.url
        if url.startswith('http'):
            return url
        return f"{settings.BASE_URL_IMAGES}{image_field.name}"
    except (AttributeError, ValueError):
        return None


class UserSerializer(serializers.ModelSerializer):
    """Serializer para usuários/jogadores"""
    
    # imagem_perfil = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telefone', 'data_nascimento', 'posicao', 'imagem_perfil',
            'data_criacao'
        ]
        read_only_fields = ['id', 'data_criacao']
        extra_kwargs = {
            'data_nascimento': {'required': False},
            'posicao': {'required': False},
            'telefone': {'required': False},
        }
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['imagem_perfil'] = get_image_url(instance.imagem_perfil)
        return representation


class UserDetailSerializer(UserSerializer):
    """Serializer detalhado de usuário com informações adicionais"""
    
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['auth_uid']


class PremioSerializer(serializers.ModelSerializer):
    """Serializer para prêmios"""
    
    class Meta:
        model = Premio
        fields = ['id', 'racha', 'nome', 'valor_pontos', 'ativo', 'criado_em']
        read_only_fields = ['id', 'criado_em']


class RachaSerializer(serializers.ModelSerializer):
    """Serializer básico para rachas"""
    
    # administrador = UserSerializer(read_only=True)
    total_jogadores = serializers.SerializerMethodField()
    imagem_perfil = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    
    class Meta:
        model = Racha
        fields = [
            'id', 'nome', 'imagem_perfil',
            'data_inicio', 'data_encerramento', 'codigo_convite',
            'ponto_gol', 'ponto_assistencia', 'ponto_presenca',
            'criado_em', 'total_jogadores', 'is_admin'
        ]
        read_only_fields = ['id', 'codigo_convite', 'criado_em']

    def get_is_admin(self, obj):
        """Verifica se o usuário atual é o administrador do racha"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return request.user in obj.administrador.all()
        return False
    
    def get_total_jogadores(self, obj):
        return obj.jogadores_racha.filter(ativo=True).count()
    
    def get_imagem_perfil(self, obj):
        """Retorna URL completa da imagem do racha"""
        return get_image_url(obj.imagem_perfil)


class RachaDetailSerializer(RachaSerializer):
    """Serializer detalhado de racha com premios"""
    
    premios = PremioSerializer(many=True, read_only=True)
    
    class Meta(RachaSerializer.Meta):
        fields = RachaSerializer.Meta.fields + ['premios']


class JogadoresRachaSerializer(serializers.ModelSerializer):
    """Serializer para vínculo jogador-racha"""
    
    jogador = UserSerializer(read_only=True)
    
    class Meta:
        model = JogadoresRacha
        fields = ['id', 'racha', 'jogador', 'data_entrada', 'ativo']
        read_only_fields = ['id', 'data_entrada']


class SolicitacaoRachaSerializer(serializers.ModelSerializer):
    """Serializer para solicitações de entrada em racha"""
    
    jogador = UserSerializer(read_only=True)
    racha = RachaSerializer(read_only=True)
    
    class Meta:
        model = SolicitacaoRacha
        fields = ['id', 'racha', 'jogador', 'status', 'criado_em']
        read_only_fields = ['id', 'criado_em']


class JogadorPartidaSerializer(serializers.ModelSerializer):
    """Serializer para presença em partida"""
    
    jogador = UserSerializer(read_only=True)
    
    class Meta:
        model = JogadorPartida
        fields = ['id', 'partida', 'jogador', 'presente']
        read_only_fields = ['id']


class RegistroPartidaSerializer(serializers.ModelSerializer):
    """Serializer para registros de gols e assistências"""
    
    jogador_gol = UserSerializer(read_only=True)
    jogador_assistencia = UserSerializer(read_only=True)
    
    class Meta:
        model = RegistroPartida
        fields = ['id', 'partida', 'jogador_gol', 'jogador_assistencia', 'criado_em']
        read_only_fields = ['id', 'criado_em']


class PremioPartidaSerializer(serializers.ModelSerializer):
    """Serializer para prêmios em partida"""
    
    premio = PremioSerializer(read_only=True)
    jogador = UserSerializer(read_only=True)
    
    class Meta:
        model = PremioPartida
        fields = ['id', 'partida', 'premio', 'jogador', 'criado_em']
        read_only_fields = ['id', 'criado_em']


class PartidaSerializer(serializers.ModelSerializer):
    """Serializer básico para partidas"""
    
    class Meta:
        model = Partida
        fields = ['id', 'racha', 'data_inicio', 'data_fim', 'criado_em', 'horario', 'local', 'status']
        read_only_fields = ['id', 'criado_em']


class PartidaDetailSerializer(PartidaSerializer):
    """Serializer detalhado de partida com registros"""
    
    jogadores_presenca = JogadorPartidaSerializer(many=True, read_only=True)
    registros = RegistroPartidaSerializer(many=True, read_only=True)
    premios_partida = PremioPartidaSerializer(many=True, read_only=True)
    racha_is_admin = serializers.SerializerMethodField()
    
    class Meta(PartidaSerializer.Meta):
        fields = PartidaSerializer.Meta.fields + [
            'jogadores_presenca', 'registros', 'premios_partida', 'racha_is_admin'
        ]

    def get_racha_is_admin(self, obj):
        """Verifica se o usuário atual é o administrador do racha"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return request.user in obj.racha.administrador.all()
        return False


class RankingJogadorSerializer(serializers.Serializer):
    """Serializer para ranking de jogadores"""
    
    jogador_id = serializers.UUIDField()
    jogador_nome = serializers.CharField()
    jogador_imagem_perfil = serializers.CharField()
    posicao = serializers.CharField()
    gols = serializers.IntegerField()
    assistencias = serializers.IntegerField()
    presencas = serializers.IntegerField()
    premios_pontos = serializers.IntegerField()
    pontuacao_total = serializers.IntegerField()
    
    class Meta:
        fields = [
            'jogador_id', 'jogador_nome', 'posicao', 'gols',
            'assistencias', 'presencas', 'premios_pontos', 'pontuacao_total', 'jogador_imagem_perfil'
        ]


class RankingArtilhariaSerializer(serializers.Serializer):
    """Serializer para ranking de artilharia"""
    
    jogador_id = serializers.UUIDField()
    jogador_nome = serializers.CharField()
    gols = serializers.IntegerField()
    posicao = serializers.IntegerField()


class RankingAssistenciasSerializer(serializers.Serializer):
    """Serializer para ranking de assistências"""
    
    jogador_id = serializers.UUIDField()
    jogador_nome = serializers.CharField()
    assistencias = serializers.IntegerField()
    posicao = serializers.IntegerField()
