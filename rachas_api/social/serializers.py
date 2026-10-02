import os

from django.conf import settings
from rest_framework import serializers

from rachas.serializers import get_image_url

from .models import Comentario, Notificacao, Post
from .servicos import pode_ver, usuario_json

EXTENSOES_IMAGEM = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
EXTENSOES_VIDEO = {'.mp4', '.webm', '.mov', '.m4v'}
MAX_IMAGEM_MB = getattr(settings, 'SOCIAL_MAX_IMAGEM_MB', 10)
MAX_VIDEO_MB = getattr(settings, 'SOCIAL_MAX_VIDEO_MB', 50)


def _mencoes(obj):
    return [{'id': str(u.id), 'username': u.username} for u in obj.mencoes.all()]


def _original_json(original, viewer, amigos):
    if original is None or not pode_ver(original, viewer, amigos):
        return None
    return {
        'id': str(original.id),
        'autor': usuario_json(original.autor),
        'texto': original.texto,
        'midia_url': get_image_url(original.midia),
        'tipo_midia': original.tipo_midia,
        'formato': original.formato,
        'criado_em': original.criado_em,
        'mencoes': _mencoes(original),
    }


class PostSerializer(serializers.ModelSerializer):
    """Leitura de um post já anotado por servicos.anotar_posts."""

    class Meta:
        model = Post
        fields = ['id']

    def to_representation(self, post):
        viewer = self.context['request'].user
        amigos = self.context.get('amigos', set())
        return {
            'id': str(post.id),
            'autor': usuario_json(post.autor),
            'texto': post.texto,
            'midia_url': get_image_url(post.midia),
            'tipo_midia': post.tipo_midia,
            'formato': post.formato,
            'visibilidade': post.visibilidade,
            'criado_em': post.criado_em,
            'mencoes': _mencoes(post),
            'total_curtidas': getattr(post, 'total_curtidas', 0),
            'total_comentarios': getattr(post, 'total_comentarios', 0),
            'total_compartilhamentos': getattr(post, 'total_compartilhamentos', 0),
            'curtido': bool(getattr(post, 'curtido', False)),
            'pode_excluir': post.autor_id == viewer.pk,
            'eh_compartilhamento': post.eh_compartilhamento,
            # Original apagado ou que o leitor não pode ver = None ("conteúdo indisponível")
            'original': _original_json(post.compartilhado_de, viewer, amigos) if post.eh_compartilhamento else None,
        }


class PostCreateSerializer(serializers.Serializer):
    texto = serializers.CharField(required=False, allow_blank=True, max_length=2200)
    midia = serializers.FileField(required=False, allow_null=True)
    formato = serializers.ChoiceField(choices=[c for c, _ in Post.FORMATOS], default=Post.POST)
    visibilidade = serializers.ChoiceField(choices=[c for c, _ in Post.VISIBILIDADES], default=Post.PUBLICO)

    def validate_midia(self, arquivo):
        if not arquivo:
            return arquivo
        ext = os.path.splitext(arquivo.name or '')[1].lower()
        tipo = (getattr(arquivo, 'content_type', '') or '').lower()
        if ext in EXTENSOES_IMAGEM and tipo.startswith('image/'):
            limite, self._tipo_midia = MAX_IMAGEM_MB, Post.IMAGEM
        elif ext in EXTENSOES_VIDEO and tipo.startswith('video/'):
            limite, self._tipo_midia = MAX_VIDEO_MB, Post.VIDEO
        else:
            raise serializers.ValidationError('Envie uma imagem (JPG, PNG, WEBP, GIF) ou um vídeo (MP4, WEBM, MOV).')
        if arquivo.size > limite * 1024 * 1024:
            raise serializers.ValidationError(f'Arquivo muito grande. Limite de {limite} MB.')
        return arquivo

    def validate(self, attrs):
        texto = (attrs.get('texto') or '').strip()
        midia = attrs.get('midia')
        if not texto and not midia:
            raise serializers.ValidationError({'texto': 'Escreva algo ou adicione uma foto/vídeo.'})
        if attrs.get('formato') == Post.REEL and getattr(self, '_tipo_midia', None) != Post.VIDEO:
            raise serializers.ValidationError({'midia': 'Reels precisam de um vídeo.'})
        attrs['texto'] = texto
        attrs['tipo_midia'] = getattr(self, '_tipo_midia', '') if midia else ''
        return attrs


class ComentarioSerializer(serializers.ModelSerializer):
    texto = serializers.CharField(max_length=1000, trim_whitespace=True)

    class Meta:
        model = Comentario
        fields = ['id', 'texto', 'criado_em']
        read_only_fields = ['id', 'criado_em']

    def to_representation(self, comentario):
        viewer = self.context['request'].user
        return {
            'id': str(comentario.id),
            'post_id': str(comentario.post_id),
            'autor': usuario_json(comentario.autor),
            'texto': comentario.texto,
            'criado_em': comentario.criado_em,
            'mencoes': _mencoes(comentario),
            'pode_excluir': viewer.pk in (comentario.autor_id, comentario.post.autor_id),
        }


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = ['id']

    def to_representation(self, n):
        return {
            'id': str(n.id),
            'tipo': n.tipo,
            'ator': usuario_json(n.ator),
            'post_id': str(n.post_id) if n.post_id else None,
            'comentario_texto': n.comentario.texto[:120] if n.comentario_id else None,
            'lida': n.lida,
            'criado_em': n.criado_em,
        }
