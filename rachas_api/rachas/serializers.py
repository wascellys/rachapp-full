from rest_framework import serializers
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from dj_rest_auth.serializers import PasswordResetSerializer
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


class UserCreateSerializer(UserSerializer):
    """Serializer de cadastro: exige senha forte e e-mail único"""

    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['password']

    def validate_email(self, value):
        value = value.strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Já existe uma conta com este e-mail.')
        return value

    def validate(self, attrs):
        candidato = User(
            username=attrs.get('username'),
            email=attrs.get('email'),
            first_name=attrs.get('first_name', ''),
            last_name=attrs.get('last_name', ''),
        )
        try:
            validate_password(attrs['password'], user=candidato)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class PremioSerializer(serializers.ModelSerializer):
    """Serializer para prêmios"""
    
    class Meta:
        model = Premio
        fields = ['id', 'racha', 'nome', 'valor_pontos', 'ativo', 'criado_em']
        read_only_fields = ['id', 'criado_em']


class RachaSerializer(serializers.ModelSerializer):
    """Serializer básico para rachas"""
    
    # administrador = UserSerializer(read_only=True)
    administradores_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=User.objects.all(), 
        source='administrador',
        required=False
    )
    total_jogadores = serializers.SerializerMethodField()
    imagem_perfil = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    
    class Meta:
        model = Racha
        fields = [
            'id', 'nome', 'descricao', 'imagem_perfil',
            'data_inicio', 'data_encerramento', 'codigo_convite',
            'ponto_gol', 'ponto_assistencia', 'ponto_presenca',
            'criado_em', 'total_jogadores', 'is_admin',
            'administradores_ids'
        ]
        read_only_fields = ['id', 'codigo_convite', 'criado_em']

    def get_is_admin(self, obj):
        """Verifica se o usuário atual é o administrador do racha"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.administrador.filter(id=request.user.id).exists()
        return False

    def validate_administradores_ids(self, value):
        if self.instance is None:
            # Na criação o administrador é sempre quem cria o racha.
            return value
        if not value:
            raise serializers.ValidationError('O racha precisa de pelo menos um administrador.')
        membros = set(
            JogadoresRacha.objects.filter(racha=self.instance, ativo=True).values_list('jogador_id', flat=True)
        ) | set(self.instance.administrador.values_list('id', flat=True))
        if any(u.id not in membros for u in value):
            raise serializers.ValidationError('Apenas jogadores ativos do racha podem ser administradores.')
        return value

    def create(self, validated_data):
        validated_data.pop('administrador', None)
        return super().create(validated_data)

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
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.racha.administrador.filter(id=request.user.id).exists()
        return False


class RankingJogadorSerializer(serializers.Serializer):
    """Serializer para ranking de jogadores"""
    
    jogador_id = serializers.UUIDField()
    jogador_nome = serializers.CharField()
    jogador_imagem_perfil = serializers.CharField(allow_blank=True)
    posicao = serializers.CharField(allow_blank=True)
    gols = serializers.IntegerField()
    assistencias = serializers.IntegerField()
    presencas = serializers.IntegerField()
    premios = serializers.IntegerField()
    premios_pontos = serializers.IntegerField()
    pontuacao_total = serializers.IntegerField()
    jogador_username = serializers.CharField(required=False)

    class Meta:
        fields = [
            'jogador_id', 'jogador_nome', 'jogador_username', 'posicao', 'gols',
            'assistencias', 'presencas', 'premios', 'premios_pontos', 'pontuacao_total',
            'jogador_imagem_perfil'
        ]


class RankingArtilhariaSerializer(serializers.Serializer):
    """Serializer para ranking de artilharia"""
    
    jogador_id = serializers.UUIDField()
    jogador_nome = serializers.CharField()
    gols = serializers.IntegerField()
    posicao = serializers.IntegerField()
    jogador_username = serializers.CharField(required=False)


class RankingAssistenciasSerializer(serializers.Serializer):
    """Serializer para ranking de assistências"""
    
    jogador_id = serializers.UUIDField()
    jogador_nome = serializers.CharField()
    assistencias = serializers.IntegerField()
    posicao = serializers.IntegerField()
    jogador_username = serializers.CharField(required=False)


def frontend_password_reset_url(request, user, temp_key):
    """Link de redefinição de senha apontando para a página do frontend."""
    from allauth.account.utils import user_pk_to_url_str

    frontend_url = settings.FRONTEND_URL.rstrip('/')
    return f"{frontend_url}/redefinir-senha/{user_pk_to_url_str(user)}/{temp_key}"


class FrontendPasswordResetSerializer(PasswordResetSerializer):
    """Envia o e-mail de "esqueci minha senha" com link para o frontend."""

    def get_email_options(self):
        return {'url_generator': frontend_password_reset_url}
