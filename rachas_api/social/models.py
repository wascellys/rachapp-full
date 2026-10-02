"""
Rede social do RachApp: amizades, posts (fotos, vídeos e reels), curtidas,
comentários, compartilhamentos, menções e notificações.

Independente do ranking: nada aqui altera pontuação de nenhum racha.
"""
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Amizade(models.Model):
    """Pedido de amizade. Aceito = amigos; recusado ou desfeito = registro apagado."""

    PENDENTE = 'PENDENTE'
    ACEITA = 'ACEITA'
    STATUS = [(PENDENTE, 'Pendente'), (ACEITA, 'Aceita')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    solicitante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='amizades_enviadas')
    destinatario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='amizades_recebidas')
    status = models.CharField(max_length=10, choices=STATUS, default=PENDENTE)
    criado_em = models.DateTimeField(auto_now_add=True)
    respondido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'social_amizades'
        constraints = [
            models.UniqueConstraint(fields=['solicitante', 'destinatario'], name='amizade_unica'),
            models.CheckConstraint(condition=~Q(solicitante=models.F('destinatario')), name='amizade_nao_consigo'),
        ]
        verbose_name = 'Amizade'
        verbose_name_plural = 'Amizades'

    def __str__(self):
        return f'{self.solicitante} -> {self.destinatario} ({self.status})'

    @staticmethod
    def entre(a, b):
        """Amizade (em qualquer direção) entre dois usuários, ou None."""
        return Amizade.objects.filter(
            Q(solicitante=a, destinatario=b) | Q(solicitante=b, destinatario=a)
        ).first()

    @staticmethod
    def ids_amigos(user):
        """Ids dos amigos aceitos de um usuário."""
        aceitas = Amizade.objects.filter(status=Amizade.ACEITA).filter(Q(solicitante=user) | Q(destinatario=user))
        ids = set()
        for solicitante_id, destinatario_id in aceitas.values_list('solicitante_id', 'destinatario_id'):
            ids.add(destinatario_id if solicitante_id == user.id else solicitante_id)
        return ids


class Post(models.Model):
    IMAGEM = 'IMAGEM'
    VIDEO = 'VIDEO'
    TIPOS_MIDIA = [(IMAGEM, 'Imagem'), (VIDEO, 'Vídeo')]

    POST = 'POST'
    REEL = 'REEL'
    FORMATOS = [(POST, 'Post'), (REEL, 'Reel')]

    PUBLICO = 'PUBLICO'
    AMIGOS = 'AMIGOS'
    VISIBILIDADES = [(PUBLICO, 'Público'), (AMIGOS, 'Só amigos')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    texto = models.TextField(blank=True, max_length=2200)
    midia = models.FileField(upload_to='social/%Y/%m/', blank=True, null=True)
    tipo_midia = models.CharField(max_length=10, choices=TIPOS_MIDIA, blank=True)
    formato = models.CharField(max_length=10, choices=FORMATOS, default=POST)
    visibilidade = models.CharField(max_length=10, choices=VISIBILIDADES, default=PUBLICO)
    # Compartilhamento: aponta sempre para o post original (nunca para outro compartilhamento)
    compartilhado_de = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='compartilhamentos'
    )
    eh_compartilhamento = models.BooleanField(default=False)
    mencoes = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='mencoes_em_posts')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'social_posts'
        ordering = ['-criado_em']
        indexes = [models.Index(fields=['-criado_em']), models.Index(fields=['formato', '-criado_em'])]
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'

    def __str__(self):
        return f'{self.autor} - {self.texto[:40]}'


class Curtida(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='curtidas')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='curtidas')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'social_curtidas'
        constraints = [models.UniqueConstraint(fields=['post', 'usuario'], name='curtida_unica')]


class Comentario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comentarios')
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comentarios_sociais')
    texto = models.TextField(max_length=1000)
    mencoes = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='mencoes_em_comentarios')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'social_comentarios'
        ordering = ['criado_em']


class Notificacao(models.Model):
    CURTIDA = 'CURTIDA'
    COMENTARIO = 'COMENTARIO'
    MENCAO = 'MENCAO'
    COMPARTILHAMENTO = 'COMPARTILHAMENTO'
    AMIZADE_PEDIDO = 'AMIZADE_PEDIDO'
    AMIZADE_ACEITA = 'AMIZADE_ACEITA'
    TIPOS = [
        (CURTIDA, 'Curtida'), (COMENTARIO, 'Comentário'), (MENCAO, 'Menção'),
        (COMPARTILHAMENTO, 'Compartilhamento'), (AMIZADE_PEDIDO, 'Pedido de amizade'),
        (AMIZADE_ACEITA, 'Amizade aceita'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    destinatario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificacoes')
    ator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True, related_name='+')
    comentario = models.ForeignKey(Comentario, on_delete=models.CASCADE, null=True, blank=True, related_name='+')
    lida = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'social_notificacoes'
        ordering = ['-criado_em']
        indexes = [models.Index(fields=['destinatario', 'lida'])]
