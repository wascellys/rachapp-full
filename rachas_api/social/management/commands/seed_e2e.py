"""
Cenário fixo para os testes de integração do frontend (Playwright).

APAGA todo o banco antes de popular. Por segurança só roda com:
  - banco SQLite, e
  - variável de ambiente E2E_SEED=1.
"""
import os
import uuid
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from rachas.models import JogadoresRacha, JogadorPartida, Partida, Premio, PremioPartida, Racha, RegistroPartida, User
from social.models import Amizade, Post

SENHA = 'Teste#2026'
PESSOAS = [
    ('ana', 'Ana', 'Souza', 'MEIA'),
    ('beto', 'Beto', 'Lima', 'ATACANTE'),
    ('caio', 'Caio', 'Ramos', 'GOLEIRO'),
    ('duda', 'Duda', 'Martins', 'ZAGUEIRO'),
    ('leonardo', 'Leonardo do Nascimento', 'Silva Nascimento', 'ATACANTE'),
]


class Command(BaseCommand):
    help = 'Recria o banco de teste com o cenário dos testes E2E da rede social (somente SQLite + E2E_SEED=1).'

    def add_arguments(self, parser):
        parser.add_argument('--fixtures', help='Pasta com time.jpg e lance.webm para as mídias de exemplo.')

    def handle(self, *args, **opts):
        engine = settings.DATABASES['default']['ENGINE']
        if 'sqlite' not in engine or os.environ.get('E2E_SEED') != '1':
            raise CommandError('seed_e2e só roda em banco SQLite com E2E_SEED=1 (ele apaga todos os dados).')

        call_command('flush', interactive=False, verbosity=0)
        u = {}
        for username, first, last, pos in PESSOAS:
            u[username] = User.objects.create_user(
                username=username, email=f'{username}@e2e.test', password=SENHA,
                first_name=first, last_name=last, posicao=pos, auth_uid=str(uuid.uuid4()),
            )

        quinta = Racha.objects.create(nome='Racha da Quinta', ponto_gol=3, ponto_assistencia=2, ponto_presenca=1)
        quinta.administrador.add(u['ana'])
        for nome in ('ana', 'beto', 'caio', 'leonardo'):
            JogadoresRacha.objects.create(racha=quinta, jogador=u[nome])
        sabado = Racha.objects.create(nome='Pelada de Sábado', ponto_gol=2, ponto_assistencia=1, ponto_presenca=1)
        sabado.administrador.add(u['duda'])
        for nome in ('duda', 'beto'):
            JogadoresRacha.objects.create(racha=sabado, jogador=u[nome])

        # Beto: 3 gols e 1 prêmio em dois rachas (estatísticas do perfil)
        craque = Premio.objects.create(racha=quinta, nome='Craque', valor_pontos=5)
        for racha, gols in ((quinta, 2), (sabado, 1)):
            partida = Partida.objects.create(racha=racha, status=False)
            for nome in ('ana', 'beto', 'caio') if racha == quinta else ('beto', 'duda'):
                JogadorPartida.objects.create(partida=partida, jogador=u[nome])
            for _ in range(gols):
                RegistroPartida.objects.create(partida=partida, jogador_gol=u['beto'], jogador_assistencia=u['ana'] if racha == quinta else None)
            if racha == quinta:
                PremioPartida.objects.create(partida=partida, premio=craque, jogador=u['beto'])

        Amizade.objects.create(solicitante=u['ana'], destinatario=u['beto'], status=Amizade.ACEITA)
        Amizade.objects.create(solicitante=u['beto'], destinatario=u['caio'], status=Amizade.ACEITA)

        fixtures = Path(opts['fixtures']) if opts.get('fixtures') else None
        foto = Post(autor=u['beto'], texto='Time campeão da quinta! Valeu @ana pela assistência', tipo_midia=Post.IMAGEM)
        reel = Post(autor=u['caio'], texto='Defesa do ano 🧤', tipo_midia=Post.VIDEO, formato=Post.REEL)
        if fixtures and (fixtures / 'time.jpg').exists():
            with open(fixtures / 'time.jpg', 'rb') as f:
                foto.midia.save('time.jpg', File(f), save=False)
        else:
            foto.tipo_midia = ''
        foto.save()
        foto.mencoes.set([u['ana']])
        if fixtures and (fixtures / 'lance.webm').exists():
            with open(fixtures / 'lance.webm', 'rb') as f:
                reel.midia.save('lance.webm', File(f), save=False)
            reel.save()
        Post.objects.create(autor=u['caio'], texto='Treino amanhã às 7h, só para os amigos', visibilidade=Post.AMIGOS)
        Post.objects.create(autor=u['duda'], texto='Pelada de sábado confirmada!')

        self.stdout.write(self.style.SUCCESS(f'Cenário E2E criado: {len(u)} usuários (senha {SENHA}).'))
