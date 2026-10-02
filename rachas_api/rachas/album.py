"""
Álbum de figurinhas do racha.

Regras:
- Cada jogador com página tem 4 figurinhas (Bronze, Prata, Ouro, Lenda).
- O administrador gera o álbum, cria páginas e distribui pacotes manualmente.
- O conteúdo do pacote é sorteado no servidor só quando o jogador abre,
  seguindo os pesos de raridade do álbum (assim páginas novas já entram no sorteio).
- Nada aqui interfere no ranking do racha.
"""
import random

from django.db import transaction
from django.db.models import Count, Max, Q, Sum
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    ORDEM_RARIDADES, Album, EnvioPacotes, Figurinha, FigurinhaJogador,
    JogadoresRacha, JogadorPartida, Pacote, PaginaAlbum, Partida, Racha, User,
)
from .permissions import is_admin_racha, is_membro_racha
from .serializers import get_image_url

MAX_PACOTES_POR_JOGADOR = 20
MAX_FIGURINHAS_POR_PACOTE = 30

_rng = random.SystemRandom()


# ─── Helpers ────────────────────────────────────────────────────────────────

def _racha_do_membro(request, racha_id):
    racha = get_object_or_404(Racha, pk=racha_id)
    if not is_membro_racha(request.user, racha, apenas_ativos=False):
        # 404 para não revelar a existência do racha
        raise Http404('Racha não encontrado.')
    return racha


def _exigir_admin(request, racha):
    if not is_admin_racha(request.user, racha):
        raise PermissionDenied('Apenas administradores do racha podem gerenciar o álbum.')


def _album_ou_404(racha):
    try:
        return racha.album
    except Album.DoesNotExist:
        raise Http404('Este racha ainda não tem álbum.')


def _jogador_json(user, ativo=None):
    nome = user.get_full_name() or user.username
    dados = {
        'id': str(user.id),
        'nome': nome,
        'username': user.username,
        'posicao': user.posicao,
        'imagem_perfil': get_image_url(user.imagem_perfil),
    }
    if ativo is not None:
        dados['ativo'] = ativo
    return dados


def _album_json(album):
    total_paginas = album.paginas.count()
    return {
        'id': str(album.id),
        'titulo': album.titulo or f'Álbum {album.racha.nome}',
        'pesos': album.pesos(),
        'criado_em': album.criado_em,
        'total_paginas': total_paginas,
        'total_figurinhas': total_paginas * len(ORDEM_RARIDADES),
    }


def _validar_pesos(dados, album=None):
    """Lê `pesos: {bronze, prata, ouro, lenda}` e devolve os campos do modelo que mudaram."""
    recebidos = dados.get('pesos') or {}
    if not isinstance(recebidos, dict):
        raise ValidationError({'pesos': 'Envie os pesos por raridade.'})
    campos = {}
    for raridade in ORDEM_RARIDADES:
        valor = recebidos.get(raridade, recebidos.get(raridade.lower()))
        if valor is None:
            continue
        try:
            valor = int(valor)
        except (TypeError, ValueError):
            raise ValidationError({'pesos': f'Peso de {raridade.title()} inválido.'})
        if not 0 <= valor <= 1000:
            raise ValidationError({'pesos': 'Os pesos devem ficar entre 0 e 1000.'})
        campos[f'peso_{raridade.lower()}'] = valor
    base = album.pesos() if album else Album().pesos()
    finais = [campos.get(f'peso_{r.lower()}', base[r]) for r in ORDEM_RARIDADES]
    if sum(finais) <= 0:
        raise ValidationError({'pesos': 'Pelo menos uma raridade precisa ter peso maior que zero.'})
    return campos


def _criar_paginas(album, jogadores):
    """Cria páginas (e as 4 figurinhas) para os jogadores informados, na ordem recebida."""
    ultimo = album.paginas.aggregate(m=Max('numero'))['m'] or 0
    criadas = []
    for jogador in jogadores:
        ultimo += 1
        pagina = PaginaAlbum.objects.create(album=album, jogador=jogador, numero=ultimo)
        Figurinha.objects.bulk_create([
            Figurinha(pagina=pagina, raridade=raridade, numero=(ultimo - 1) * len(ORDEM_RARIDADES) + i + 1)
            for i, raridade in enumerate(ORDEM_RARIDADES)
        ])
        criadas.append(pagina)
    return criadas


def _membros_sem_pagina(album):
    com_pagina = album.paginas.values_list('jogador_id', flat=True)
    return (
        JogadoresRacha.objects.filter(racha=album.racha, ativo=True)
        .exclude(jogador_id__in=com_pagina)
        .select_related('jogador')
        .order_by('jogador__first_name', 'jogador__last_name', 'jogador__username')
    )


def sortear_figurinhas(album, quantidade, rng=_rng):
    """Sorteia `quantidade` figurinhas: primeiro a raridade (pelos pesos), depois o jogador."""
    por_raridade = {r: [] for r in ORDEM_RARIDADES}
    for fig in Figurinha.objects.filter(pagina__album=album).only('id', 'raridade'):
        por_raridade[fig.raridade].append(fig)
    pesos = album.pesos()
    disponiveis = [r for r in ORDEM_RARIDADES if por_raridade[r] and pesos[r] > 0]
    if not disponiveis:
        return []
    raridades = rng.choices(disponiveis, weights=[pesos[r] for r in disponiveis], k=quantidade)
    return [rng.choice(por_raridade[r]) for r in raridades]


def _progresso(album, user):
    total = album.paginas.count() * len(ORDEM_RARIDADES)
    itens = FigurinhaJogador.objects.filter(dono=user, figurinha__pagina__album=album, quantidade__gt=0)
    coladas = itens.filter(colada=True).count()
    para_colar = itens.filter(colada=False).count()
    repetidas = sum(i.quantidade - 1 for i in itens if i.quantidade > 1)
    por_raridade = {}
    for raridade in ORDEM_RARIDADES:
        por_raridade[raridade] = {
            'coladas': itens.filter(colada=True, figurinha__raridade=raridade).count(),
            'total': album.paginas.count(),
        }
    return {
        'total': total,
        'coladas': coladas,
        'para_colar': para_colar,
        'repetidas': repetidas,
        'percentual': round(coladas * 100 / total, 1) if total else 0,
        'por_raridade': por_raridade,
    }


def _colecionadores(album, limite=10):
    total = album.paginas.count() * len(ORDEM_RARIDADES)
    linhas = (
        FigurinhaJogador.objects.filter(figurinha__pagina__album=album, colada=True)
        .values('dono')
        .annotate(coladas=Count('id'))
        .order_by('-coladas')[:limite]
    )
    usuarios = {u.id: u for u in User.objects.filter(id__in=[l['dono'] for l in linhas])}
    return [
        {
            **_jogador_json(usuarios[l['dono']]),
            'coladas': l['coladas'],
            'percentual': round(l['coladas'] * 100 / total, 1) if total else 0,
        }
        for l in linhas if l['dono'] in usuarios
    ]


def resumo_album_usuario(racha, user):
    """Resumo leve usado no cabeçalho do racha (badge de pacotes)."""
    try:
        album = racha.album
    except Album.DoesNotExist:
        return {'existe': False, 'pacotes_fechados': 0, 'para_colar': 0}
    return {
        'existe': True,
        'pacotes_fechados': Pacote.objects.filter(album=album, dono=user, aberto_em__isnull=True).count(),
        'para_colar': FigurinhaJogador.objects.filter(
            dono=user, figurinha__pagina__album=album, quantidade__gt=0, colada=False
        ).count(),
    }


# ─── Endpoints ──────────────────────────────────────────────────────────────

@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def album(request, racha_id):
    """
    GET: álbum com as páginas e a coleção do usuário logado.
    POST (admin): gera o álbum; por padrão já cria páginas para todos os membros ativos.
    PATCH (admin): altera título e pesos de raridade.
    """
    racha = _racha_do_membro(request, racha_id)
    admin = is_admin_racha(request.user, racha)

    if request.method == 'POST':
        _exigir_admin(request, racha)
        if Album.objects.filter(racha=racha).exists():
            raise ValidationError({'detail': 'Este racha já tem um álbum.'})
        pesos = _validar_pesos(request.data)
        with transaction.atomic():
            novo = Album.objects.create(
                racha=racha, criado_por=request.user,
                titulo=(request.data.get('titulo') or '').strip()[:120], **pesos,
            )
            if request.data.get('gerar_paginas', True) not in (False, 'false', 0, '0'):
                _criar_paginas(novo, [m.jogador for m in _membros_sem_pagina(novo)])
        return Response(_album_json(novo), status=status.HTTP_201_CREATED)

    if request.method == 'PATCH':
        _exigir_admin(request, racha)
        alvo = _album_ou_404(racha)
        pesos = _validar_pesos(request.data, alvo)
        for campo, valor in pesos.items():
            setattr(alvo, campo, valor)
        if 'titulo' in request.data:
            alvo.titulo = (request.data.get('titulo') or '').strip()[:120]
        alvo.save()
        return Response(_album_json(alvo))

    try:
        atual = racha.album
    except Album.DoesNotExist:
        return Response({'existe': False, 'is_admin': admin, 'racha_nome': racha.nome})

    ativos = dict(JogadoresRacha.objects.filter(racha=racha).values_list('jogador_id', 'ativo'))
    colecao = {
        item.figurinha_id: item
        for item in FigurinhaJogador.objects.filter(dono=request.user, figurinha__pagina__album=atual)
    }
    paginas = []
    for pagina in atual.paginas.select_related('jogador').prefetch_related('figurinhas'):
        figs = sorted(pagina.figurinhas.all(), key=lambda f: ORDEM_RARIDADES.index(f.raridade))
        paginas.append({
            'id': str(pagina.id),
            'numero': pagina.numero,
            'jogador': _jogador_json(pagina.jogador, ativos.get(pagina.jogador_id, False)),
            'figurinhas': [
                {
                    'id': str(f.id),
                    'numero': f.numero,
                    'raridade': f.raridade,
                    'quantidade': colecao[f.id].quantidade if f.id in colecao else 0,
                    'colada': colecao[f.id].colada if f.id in colecao else False,
                }
                for f in figs
            ],
        })

    fechados = Pacote.objects.filter(album=atual, dono=request.user, aberto_em__isnull=True)
    return Response({
        'existe': True,
        'is_admin': admin,
        'racha_nome': racha.nome,
        'album': _album_json(atual),
        'paginas': paginas,
        'progresso': _progresso(atual, request.user),
        'pacotes_fechados': [
            {'id': str(p.id), 'quantidade_figurinhas': p.quantidade_figurinhas, 'motivo': p.motivo, 'criado_em': p.criado_em}
            for p in fechados
        ],
        'colecionadores': _colecionadores(atual),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def painel(request, racha_id):
    """Dados do painel administrativo: métricas, membros, páginas pendentes, envios e partidas recentes."""
    racha = _racha_do_membro(request, racha_id)
    _exigir_admin(request, racha)
    alvo = _album_ou_404(racha)

    total_paginas = alvo.paginas.count()
    total_figurinhas = total_paginas * len(ORDEM_RARIDADES)
    pacotes = Pacote.objects.filter(album=alvo)
    abertos = pacotes.filter(aberto_em__isnull=False)

    coladas_por_dono = dict(
        FigurinhaJogador.objects.filter(figurinha__pagina__album=alvo, colada=True)
        .values('dono').annotate(n=Count('id')).values_list('dono', 'n')
    )
    fechados_por_dono = dict(
        pacotes.filter(aberto_em__isnull=True).values('dono').annotate(n=Count('id')).values_list('dono', 'n')
    )
    com_pagina = set(alvo.paginas.values_list('jogador_id', flat=True))

    membros = []
    for vinculo in JogadoresRacha.objects.filter(racha=racha).select_related('jogador').order_by(
        'jogador__first_name', 'jogador__last_name', 'jogador__username'
    ):
        jogador = vinculo.jogador
        coladas = coladas_por_dono.get(jogador.id, 0)
        membros.append({
            **_jogador_json(jogador, vinculo.ativo),
            'tem_pagina': jogador.id in com_pagina,
            'pacotes_fechados': fechados_por_dono.get(jogador.id, 0),
            'coladas': coladas,
            'percentual': round(coladas * 100 / total_figurinhas, 1) if total_figurinhas else 0,
        })

    colecionadores = [m for m in membros if m['coladas'] > 0]
    obtidas = (
        FigurinhaJogador.objects.filter(figurinha__pagina__album=alvo)
        .values('figurinha__raridade').annotate(n=Sum('quantidade'))
    )
    obtidas_por_raridade = {r: 0 for r in ORDEM_RARIDADES}
    for linha in obtidas:
        obtidas_por_raridade[linha['figurinha__raridade']] = linha['n'] or 0

    envios = []
    for envio in alvo.envios.select_related('enviado_por').annotate(
        abertos=Count('pacotes', filter=Q(pacotes__aberto_em__isnull=False)),
        total=Count('pacotes'),
    )[:20]:
        envios.append({
            'id': str(envio.id),
            'criado_em': envio.criado_em,
            'motivo': envio.motivo,
            'enviado_por': (envio.enviado_por.get_full_name() or envio.enviado_por.username) if envio.enviado_por else None,
            'pacotes_por_jogador': envio.pacotes_por_jogador,
            'figurinhas_por_pacote': envio.figurinhas_por_pacote,
            'destinatarios': envio.total_destinatarios,
            'pacotes_total': envio.total,
            'pacotes_abertos': envio.abertos,
        })

    partidas = []
    for partida in Partida.objects.filter(racha=racha).order_by('-data_inicio', '-criado_em')[:10]:
        presentes = list(
            JogadorPartida.objects.filter(partida=partida, presente=True).values_list('jogador_id', flat=True)
        )
        partidas.append({
            'id': str(partida.id),
            'data': partida.data_inicio or partida.criado_em,
            'status': partida.status,
            'presentes_ids': [str(p) for p in presentes],
        })

    return Response({
        'album': _album_json(alvo),
        'metricas': {
            'paginas': total_paginas,
            'figurinhas': total_figurinhas,
            'pacotes_enviados': pacotes.count(),
            'pacotes_abertos': abertos.count(),
            'pacotes_fechados': pacotes.count() - abertos.count(),
            'figurinhas_distribuidas': sum(len(p) for p in abertos.values_list('conteudo', flat=True)),
            'colecionadores': len(colecionadores),
            'media_conclusao': round(sum(m['percentual'] for m in colecionadores) / len(colecionadores), 1) if colecionadores else 0,
            'albuns_completos': sum(1 for m in colecionadores if total_figurinhas and m['coladas'] >= total_figurinhas),
            'obtidas_por_raridade': obtidas_por_raridade,
        },
        'membros': membros,
        'sem_pagina': [m for m in membros if m['ativo'] and not m['tem_pagina']],
        'envios': envios,
        'partidas': partidas,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gerar_paginas(request, racha_id):
    """Cria páginas para os membros ativos sem página (todos, ou só os `jogadores_ids` informados)."""
    racha = _racha_do_membro(request, racha_id)
    _exigir_admin(request, racha)
    alvo = _album_ou_404(racha)

    pendentes = _membros_sem_pagina(alvo)
    ids = request.data.get('jogadores_ids')
    if ids:
        if not isinstance(ids, list):
            raise ValidationError({'jogadores_ids': 'Envie uma lista de jogadores.'})
        pendentes = pendentes.filter(jogador_id__in=ids)
    jogadores = [m.jogador for m in pendentes]
    if not jogadores:
        raise ValidationError({'detail': 'Nenhum jogador ativo sem página para criar.'})
    with transaction.atomic():
        criadas = _criar_paginas(alvo, jogadores)
    return Response({'criadas': len(criadas), 'album': _album_json(alvo)}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def distribuir_pacotes(request, racha_id):
    """
    Envia pacotes fechados para membros ativos.
    Corpo: { todos: bool, jogadores_ids: [...], pacotes_por_jogador, figurinhas_por_pacote, motivo }
    """
    racha = _racha_do_membro(request, racha_id)
    _exigir_admin(request, racha)
    alvo = _album_ou_404(racha)
    if not alvo.paginas.exists():
        raise ValidationError({'detail': 'Crie as páginas do álbum antes de enviar pacotes.'})

    def inteiro(campo, minimo, maximo, padrao):
        valor = request.data.get(campo, padrao)
        try:
            valor = int(valor)
        except (TypeError, ValueError):
            raise ValidationError({campo: 'Informe um número inteiro.'})
        if not minimo <= valor <= maximo:
            raise ValidationError({campo: f'Use um valor entre {minimo} e {maximo}.'})
        return valor

    pacotes_por_jogador = inteiro('pacotes_por_jogador', 1, MAX_PACOTES_POR_JOGADOR, 1)
    figurinhas_por_pacote = inteiro('figurinhas_por_pacote', 1, MAX_FIGURINHAS_POR_PACOTE, 5)
    motivo = (request.data.get('motivo') or '').strip()[:120]

    ativos = JogadoresRacha.objects.filter(racha=racha, ativo=True)
    if request.data.get('todos') in (True, 'true', 1, '1'):
        destinatarios = list(ativos.values_list('jogador_id', flat=True))
    else:
        ids = request.data.get('jogadores_ids') or []
        if not isinstance(ids, list) or not ids:
            raise ValidationError({'jogadores_ids': 'Escolha pelo menos um jogador.'})
        destinatarios = list(ativos.filter(jogador_id__in=ids).values_list('jogador_id', flat=True))
        if len(destinatarios) != len(set(map(str, ids))):
            raise ValidationError({'jogadores_ids': 'Só é possível enviar pacotes para membros ativos do racha.'})
    if not destinatarios:
        raise ValidationError({'detail': 'Nenhum membro ativo para receber pacotes.'})

    with transaction.atomic():
        envio = EnvioPacotes.objects.create(
            album=alvo, enviado_por=request.user, motivo=motivo,
            pacotes_por_jogador=pacotes_por_jogador, figurinhas_por_pacote=figurinhas_por_pacote,
            total_destinatarios=len(destinatarios),
        )
        Pacote.objects.bulk_create([
            Pacote(album=alvo, envio=envio, dono_id=jogador_id,
                   quantidade_figurinhas=figurinhas_por_pacote, motivo=motivo)
            for jogador_id in destinatarios
            for _ in range(pacotes_por_jogador)
        ])
    return Response({
        'envio_id': str(envio.id),
        'destinatarios': len(destinatarios),
        'pacotes': len(destinatarios) * pacotes_por_jogador,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def abrir_pacote(request, racha_id):
    """Abre um pacote do usuário (o informado em `pacote_id` ou o mais antigo) e sorteia o conteúdo."""
    racha = _racha_do_membro(request, racha_id)
    alvo = _album_ou_404(racha)

    with transaction.atomic():
        fila = Pacote.objects.select_for_update().filter(album=alvo, dono=request.user, aberto_em__isnull=True)
        pacote_id = request.data.get('pacote_id')
        pacote = (fila.filter(pk=pacote_id) if pacote_id else fila.order_by('criado_em')).first()
        if not pacote:
            raise ValidationError({'detail': 'Você não tem pacotes para abrir.'})

        sorteadas = sortear_figurinhas(alvo, pacote.quantidade_figurinhas)
        if not sorteadas:
            raise ValidationError({'detail': 'O álbum ainda não tem figurinhas.'})

        colecao = {
            item.figurinha_id: item
            for item in FigurinhaJogador.objects.select_for_update().filter(
                dono=request.user, figurinha_id__in={f.id for f in sorteadas}
            )
        }
        resultado = []
        for fig in sorteadas:
            item = colecao.get(fig.id)
            if item is None:
                item = colecao[fig.id] = FigurinhaJogador(dono=request.user, figurinha=fig, quantidade=0)
            nova = item.quantidade == 0
            item.quantidade += 1
            resultado.append((fig, nova))
        for item in colecao.values():
            item.save()

        pacote.conteudo = [str(f.id) for f in sorteadas]
        pacote.aberto_em = timezone.now()
        pacote.save(update_fields=['conteudo', 'aberto_em'])

    figs = {
        f.id: f for f in Figurinha.objects.filter(id__in={f.id for f in sorteadas}).select_related('pagina__jogador')
    }
    # Mais raras por último, para o suspense da abertura
    resultado.sort(key=lambda par: ORDEM_RARIDADES.index(par[0].raridade))
    return Response({
        'pacote_id': str(pacote.id),
        'figurinhas': [
            {
                'id': str(fig.id),
                'numero': figs[fig.id].numero,
                'raridade': fig.raridade,
                'nova': nova,
                'jogador': _jogador_json(figs[fig.id].pagina.jogador),
            }
            for fig, nova in resultado
        ],
        'restantes': Pacote.objects.filter(album=alvo, dono=request.user, aberto_em__isnull=True).count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def colar_figurinhas(request, racha_id):
    """Cola no álbum as figurinhas obtidas e ainda não coladas (todas, ou só `figurinha_ids`)."""
    racha = _racha_do_membro(request, racha_id)
    alvo = _album_ou_404(racha)
    itens = FigurinhaJogador.objects.filter(
        dono=request.user, figurinha__pagina__album=alvo, quantidade__gt=0, colada=False
    )
    ids = request.data.get('figurinha_ids')
    if ids:
        if not isinstance(ids, list):
            raise ValidationError({'figurinha_ids': 'Envie uma lista de figurinhas.'})
        itens = itens.filter(figurinha_id__in=ids)
    coladas = itens.update(colada=True)
    return Response({'coladas': coladas, 'progresso': _progresso(alvo, request.user)})
