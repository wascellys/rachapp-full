from django.contrib import admin

from .models import Amizade, Comentario, Curtida, Notificacao, Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('autor', 'formato', 'tipo_midia', 'visibilidade', 'eh_compartilhamento', 'criado_em')
    list_filter = ('formato', 'tipo_midia', 'visibilidade')
    search_fields = ('texto', 'autor__username', 'autor__first_name')


@admin.register(Comentario)
class ComentarioAdmin(admin.ModelAdmin):
    list_display = ('autor', 'post', 'criado_em')
    search_fields = ('texto', 'autor__username')


@admin.register(Amizade)
class AmizadeAdmin(admin.ModelAdmin):
    list_display = ('solicitante', 'destinatario', 'status', 'criado_em')
    list_filter = ('status',)


admin.site.register(Curtida)
admin.site.register(Notificacao)
