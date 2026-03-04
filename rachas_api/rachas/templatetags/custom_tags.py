from django import template
from django.conf import settings

register = template.Library()

@register.simple_tag
def get_frontend_url():
    """
    Retorna a URL do frontend configurada no settings.py
    """
    return getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
