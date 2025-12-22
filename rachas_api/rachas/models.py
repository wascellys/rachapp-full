import uuid
import string
import random
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.conf import settings


class User(AbstractUser):
    """Modelo de usuário estendido com campos específicos para jogadores"""
    
    POSICOES = [
        ('GOLEIRO', 'Goleiro'),
        ('ZAGUEIRO', 'Zagueiro'),
        ('LATERAL', 'Lateral'),
        ('VOLANTE', 'Volante'),
        ('MEIA', 'Meia'),
        ('ATACANTE', 'Atacante'),
        ('DEFENSOR', 'Defensor'), # Mantendo para compatibilidade
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    data_nascimento = models.DateField(blank=True, null=True)
    posicao = models.CharField(max_length=20, choices=POSICOES)
    imagem_perfil = models.ImageField(upload_to='perfis/', blank=True, null=True)
    auth_uid = models.CharField(max_length=255)
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    def get_imagem_perfil_url(self):
        """Retorna a URL absoluta da imagem de perfil"""
        if not self.imagem_perfil:
            return None
        if self.imagem_perfil.url.startswith('http'):
            return self.imagem_perfil.url
        return f"{settings.MEDIA_URL}{self.imagem_perfil.name}"
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
    
    def __str__(self):
        return self.get_full_name() or self.username


class Racha(models.Model):
    """Modelo para representar um racha (pelada)"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    administrador = models.ManyToManyField(User, related_name='rachas_administrados')
    nome = models.CharField(max_length=255)
    imagem_perfil = models.ImageField(upload_to='rachas/', blank=True, null=True)
    data_inicio = models.DateField(blank=True, null=True)
    data_encerramento = models.DateField(blank=True, null=True)
    codigo_convite = models.CharField(max_length=5, unique=True, editable=False)
    ponto_gol = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    ponto_assistencia = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    ponto_presenca = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    criado_em = models.DateTimeField(auto_now_add=True)
    descricao = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'rachas'
        verbose_name = 'Racha'
        verbose_name_plural = 'Rachas'
        ordering = ['-criado_em']
    
    def __str__(self):
        return self.nome
    
    def save(self, *args, **kwargs):
        """Gera código de convite automaticamente se não existir"""
        if not self.codigo_convite:
            self.codigo_convite = self._gerar_codigo_convite()
        super().save(*args, **kwargs)
    
    @staticmethod
    def _gerar_codigo_convite():
        """Gera um código de 5 caracteres único"""
        while True:
            codigo = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
            if not Racha.objects.filter(codigo_convite=codigo).exists():
                return codigo


class JogadoresRacha(models.Model):
    """Tabela de vínculo entre jogador e racha"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    racha = models.ForeignKey(Racha, on_delete=models.CASCADE, related_name='jogadores_racha')
    jogador = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rachas_participando')
    data_entrada = models.DateTimeField(auto_now_add=True)
    ativo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'jogadores_racha'
        unique_together = ('racha', 'jogador')
        verbose_name = 'Jogador do Racha'
        verbose_name_plural = 'Jogadores do Racha'
    
    def __str__(self):
        return f"{self.jogador.get_full_name()} - {self.racha.nome}"


class Premio(models.Model):
    """Prêmios configurados pelo administrador do racha"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    racha = models.ForeignKey(Racha, on_delete=models.CASCADE, related_name='premios')
    nome = models.CharField(max_length=255)
    valor_pontos = models.IntegerField(validators=[MinValueValidator(0)])
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'premios'
        verbose_name = 'Prêmio'
        verbose_name_plural = 'Prêmios'
        ordering = ['-criado_em']
    
    def __str__(self):
        return f"{self.nome} ({self.valor_pontos} pts)"


class Partida(models.Model):
    """Registro de um evento de racha (partida diária)"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    racha = models.ForeignKey(Racha, on_delete=models.CASCADE, related_name='partidas')
    data_inicio = models.DateTimeField(blank=True, null=True)
    data_fim = models.DateTimeField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    status = models.BooleanField(default=True)  # True = Ativa, False = Encerrada
    local = models.CharField(max_length=255, blank=True, null=True)
    horario = models.CharField(max_length=50, blank=True, null=True)
    
    class Meta:
        db_table = 'partidas'
        verbose_name = 'Partida'
        verbose_name_plural = 'Partidas'
        ordering = ['-criado_em']
    
    def __str__(self):
        return f"Partida {self.racha.nome} - {self.criado_em.strftime('%d/%m/%Y')}"


class JogadorPartida(models.Model):
    """Presença de jogadores na partida"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partida = models.ForeignKey(Partida, on_delete=models.CASCADE, related_name='jogadores_presenca')
    jogador = models.ForeignKey(User, on_delete=models.CASCADE, related_name='presencas_partida')
    presente = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'jogador_partida'
        unique_together = ('partida', 'jogador')
        verbose_name = 'Presença Jogador'
        verbose_name_plural = 'Presenças Jogadores'
    
    def __str__(self):
        return f"{self.jogador.get_full_name()} - {self.partida}"


class RegistroPartida(models.Model):
    """Registro de eventos (gols e assistências)"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partida = models.ForeignKey(Partida, on_delete=models.CASCADE, related_name='registros')
    jogador_gol = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gols_registrados')
    jogador_assistencia = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='assistencias_registradas'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'registro_partida'
        verbose_name = 'Registro Partida'
        verbose_name_plural = 'Registros Partidas'
        ordering = ['-criado_em']
    
    def __str__(self):
        return f"Gol: {self.jogador_gol.get_full_name()}"


class PremioPartida(models.Model):
    """Prêmios aplicados a jogadores em uma partida"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partida = models.ForeignKey(Partida, on_delete=models.CASCADE, related_name='premios_partida')
    premio = models.ForeignKey(Premio, on_delete=models.CASCADE)
    jogador = models.ForeignKey(User, on_delete=models.CASCADE, related_name='premios_recebidos')
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'premio_partida'
        verbose_name = 'Prêmio Partida'
        verbose_name_plural = 'Prêmios Partidas'
        ordering = ['-criado_em']
    
    def __str__(self):
        return f"{self.premio.nome} - {self.jogador.get_full_name()}"


class SolicitacaoRacha(models.Model):
    """Solicitações de usuários para entrar em um racha"""
    
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('ACEITO', 'Aceito'),
        ('NEGADO', 'Negado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    racha = models.ForeignKey(Racha, on_delete=models.CASCADE, related_name='solicitacoes')
    jogador = models.ForeignKey(User, on_delete=models.CASCADE, related_name='solicitacoes_racha')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDENTE')
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'solicitacao_racha'
        unique_together = ('racha', 'jogador','status')
        verbose_name = 'Solicitação Racha'
        verbose_name_plural = 'Solicitações Rachas'
        ordering = ['-criado_em']
    
    def __str__(self):
        return f"{self.jogador.get_full_name()} - {self.racha.nome} ({self.status})"
