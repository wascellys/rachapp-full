from django.contrib import admin
from .models import (
    User, Racha, JogadoresRacha, Premio, Partida,
    JogadorPartida, RegistroPartida, PremioPartida, SolicitacaoRacha
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'posicao', 'data_nascimento', 'data_criacao')
    list_filter = ('posicao', 'data_criacao')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    readonly_fields = ('id', 'auth_uid', 'data_criacao')
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('username', 'email', 'first_name', 'last_name')
        }),
        ('Dados do Jogador', {
            'fields': ('data_nascimento', 'posicao', 'telefone', 'imagem_perfil')
        }),
        ('Autenticação', {
            'fields': ('auth_uid', 'id', 'data_criacao')
        }),
    )


@admin.register(Racha)
class RachaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'codigo_convite', 'criado_em')
    list_filter = ('criado_em',)
    search_fields = ('nome', 'codigo_convite')
    readonly_fields = ('id', 'codigo_convite', 'criado_em')
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'administrador', 'imagem_perfil')
        }),
        ('Datas', {
            'fields': ('data_inicio', 'data_encerramento')
        }),
        ('Pontuação', {
            'fields': ('ponto_gol', 'ponto_assistencia', 'ponto_presenca')
        }),
        ('Sistema', {
            'fields': ('codigo_convite', 'id', 'criado_em'),
            'classes': ('collapse',)
        }),
    )


@admin.register(JogadoresRacha)
class JogadoresRachaAdmin(admin.ModelAdmin):
    list_display = ('jogador', 'racha', 'ativo', 'data_entrada')
    list_filter = ('ativo', 'racha', 'data_entrada')
    search_fields = ('jogador__username', 'racha__nome')
    readonly_fields = ('id', 'data_entrada')


@admin.register(Premio)
class PremioAdmin(admin.ModelAdmin):
    list_display = ('nome', 'racha', 'valor_pontos', 'ativo', 'criado_em')
    list_filter = ('ativo', 'racha', 'criado_em')
    search_fields = ('nome', 'racha__nome')
    readonly_fields = ('id', 'criado_em')


@admin.register(Partida)
class PartidaAdmin(admin.ModelAdmin):
    list_display = ('racha', 'data_inicio', 'data_fim', 'criado_em')
    list_filter = ('racha', 'criado_em', 'data_inicio')
    search_fields = ('racha__nome',)
    readonly_fields = ('id', 'criado_em')


@admin.register(JogadorPartida)
class JogadorPartidaAdmin(admin.ModelAdmin):
    list_display = ('jogador', 'partida', 'presente')
    list_filter = ('presente', 'partida__racha')
    search_fields = ('jogador__username', 'partida__racha__nome')
    readonly_fields = ('id',)


@admin.register(RegistroPartida)
class RegistroPartidaAdmin(admin.ModelAdmin):
    list_display = ('jogador_gol', 'jogador_assistencia', 'partida', 'criado_em')
    list_filter = ('partida__racha', 'criado_em')
    search_fields = ('jogador_gol__username', 'jogador_assistencia__username', 'partida__racha__nome')
    readonly_fields = ('id', 'criado_em')


@admin.register(PremioPartida)
class PremioPartidaAdmin(admin.ModelAdmin):
    list_display = ('premio', 'jogador', 'partida', 'criado_em')
    list_filter = ('partida__racha', 'criado_em')
    search_fields = ('premio__nome', 'jogador__username', 'partida__racha__nome')
    readonly_fields = ('id', 'criado_em')


@admin.register(SolicitacaoRacha)
class SolicitacaoRachaAdmin(admin.ModelAdmin):
    list_display = ('jogador', 'racha', 'status', 'criado_em')
    list_filter = ('status', 'racha', 'criado_em')
    search_fields = ('jogador__username', 'racha__nome')
    readonly_fields = ('id', 'criado_em')
    
    actions = ['aprovar_solicitacoes', 'negar_solicitacoes']
    
    def aprovar_solicitacoes(self, request, queryset):
        for solicitacao in queryset.filter(status='PENDENTE'):
            JogadoresRacha.objects.get_or_create(
                racha=solicitacao.racha,
                jogador=solicitacao.jogador
            )
            solicitacao.status = 'ACEITO'
            solicitacao.save()
        self.message_user(request, f"{queryset.count()} solicitações aprovadas.")
    
    def negar_solicitacoes(self, request, queryset):
        queryset.filter(status='PENDENTE').update(status='NEGADO')
        self.message_user(request, f"{queryset.count()} solicitações negadas.")
    
    aprovar_solicitacoes.short_description = "Aprovar solicitações selecionadas"
    negar_solicitacoes.short_description = "Negar solicitações selecionadas"
