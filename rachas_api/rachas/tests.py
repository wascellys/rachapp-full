"""
Suíte de testes de fluxos da API do RachApp.

Cobre autenticação, permissões, rachas, solicitações, partidas, prêmios,
rankings e recuperação de senha. Cada teste descreve um fluxo real usado
pelo frontend (rachas_web) ou uma regra de segurança esperada.
"""
import re
import uuid

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import (
    Racha, JogadoresRacha, Premio, Partida, JogadorPartida,
    RegistroPartida, PremioPartida, SolicitacaoRacha,
)

User = get_user_model()


def criar_usuario(username, **extra):
    defaults = {
        'email': f'{username}@teste.com',
        'password': 'SenhaForte#2026',
        'first_name': username.capitalize(),
        'last_name': 'Silva',
        'posicao': 'ATACANTE',
        'auth_uid': str(uuid.uuid4()),
    }
    defaults.update(extra)
    return User.objects.create_user(username=username, **defaults)


class BaseRachaTestCase(APITestCase):
    """Cenário padrão: admin, jogador membro e um estranho fora do racha."""

    def setUp(self):
        self.admin = criar_usuario('admin')
        self.jogador = criar_usuario('jogador')
        self.estranho = criar_usuario('estranho')

        self.racha = Racha.objects.create(
            nome='Racha da Quinta', ponto_gol=3, ponto_assistencia=2, ponto_presenca=1,
        )
        self.racha.administrador.add(self.admin)
        JogadoresRacha.objects.create(racha=self.racha, jogador=self.admin)
        JogadoresRacha.objects.create(racha=self.racha, jogador=self.jogador)

        self.partida = Partida.objects.create(racha=self.racha)
        self.premio = Premio.objects.create(racha=self.racha, nome='Craque', valor_pontos=5)

    def como(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client


# ---------------------------------------------------------------------------
# Usuários e autenticação
# ---------------------------------------------------------------------------
class CadastroLoginTests(APITestCase):

    def test_cadastro_e_login_com_jwt(self):
        resp = self.client.post('/api/v1/usuarios/', {
            'username': 'novato', 'email': 'novato@teste.com', 'password': 'SenhaForte#2026',
            'first_name': 'Novo', 'last_name': 'Jogador', 'posicao': 'MEIA',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertNotIn('password', resp.data)

        token = self.client.post('/api/auth/token/', {
            'username': 'novato', 'password': 'SenhaForte#2026',
        }, format='json')
        self.assertEqual(token.status_code, status.HTTP_200_OK)
        self.assertIn('access', token.data)
        self.assertIn('refresh', token.data)

    def test_cadastro_rejeita_senha_fraca(self):
        resp = self.client.post('/api/v1/usuarios/', {
            'username': 'fraco', 'email': 'fraco@teste.com', 'password': '123',
            'first_name': 'F', 'last_name': 'R', 'posicao': 'MEIA',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='fraco').exists())

    def test_cadastro_exige_senha(self):
        resp = self.client.post('/api/v1/usuarios/', {
            'username': 'semsenha', 'email': 'semsenha@teste.com', 'posicao': 'MEIA',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cadastro_rejeita_email_duplicado(self):
        criar_usuario('existente', email='dup@teste.com')
        resp = self.client.post('/api/v1/usuarios/', {
            'username': 'outro', 'email': 'DUP@teste.com', 'password': 'SenhaForte#2026',
            'first_name': 'O', 'last_name': 'U', 'posicao': 'MEIA',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class UsuarioPermissaoTests(BaseRachaTestCase):

    def test_anonimo_nao_lista_usuarios(self):
        resp = APIClient().get('/api/v1/usuarios/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonimo_nao_altera_outro_usuario(self):
        resp = APIClient().patch(f'/api/v1/usuarios/{self.jogador.id}/', {'first_name': 'Hacker'}, format='json')
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
        self.jogador.refresh_from_db()
        self.assertNotEqual(self.jogador.first_name, 'Hacker')

    def test_anonimo_nao_exclui_usuario(self):
        resp = APIClient().delete(f'/api/v1/usuarios/{self.jogador.id}/')
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
        self.assertTrue(User.objects.filter(id=self.jogador.id).exists())

    def test_usuario_nao_altera_outro_usuario(self):
        resp = self.como(self.estranho).patch(
            f'/api/v1/usuarios/{self.jogador.id}/', {'first_name': 'Hacker'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_anonimo_retorna_401(self):
        resp = APIClient().get('/api/v1/usuarios/me/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_retorna_e_atualiza_dados(self):
        client = self.como(self.jogador)
        resp = client.get('/api/v1/usuarios/me/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'jogador')

        resp = client.patch('/api/v1/usuarios/me/', {'first_name': 'Novo', 'posicao': 'GOLEIRO'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['first_name'], 'Novo')
        self.assertEqual(resp.data['posicao'], 'GOLEIRO')

    def test_detalhe_de_usuario_nao_expoe_auth_uid_de_terceiros(self):
        resp = self.como(self.estranho).get(f'/api/v1/usuarios/{self.jogador.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotIn('auth_uid', resp.data)

    def test_proxy_image_exige_login(self):
        resp = APIClient().get('/api/v1/usuarios/proxy_image/', {'url': 'http://example.com/a.png'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(BASE_URL_IMAGES='http://api.local/media/')
    def test_proxy_image_serve_midia_local_e_bloqueia_traversal(self):
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage
        nome = default_storage.save('perfis/teste_proxy.png', ContentFile(b'\x89PNG fake'))
        try:
            ok = self.como(self.jogador).get('/api/v1/usuarios/proxy_image/', {'url': f'http://api.local/media/{nome}'})
            self.assertEqual(ok.status_code, status.HTTP_200_OK)
            self.assertEqual(ok['Content-Type'], 'image/png')
            ruim = self.como(self.jogador).get('/api/v1/usuarios/proxy_image/',
                                               {'url': 'http://api.local/media/../config/settings.py'})
            self.assertIn(ruim.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND))
        finally:
            default_storage.delete(nome)

    def test_proxy_image_bloqueia_hosts_internos(self):
        for url in ('http://127.0.0.1:8000/admin/', 'http://169.254.169.254/latest/meta-data/',
                    'file:///etc/passwd', 'http://localhost/'):
            resp = self.como(self.jogador).get('/api/v1/usuarios/proxy_image/', {'url': url})
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, url)


# ---------------------------------------------------------------------------
# Rachas
# ---------------------------------------------------------------------------
class RachaTests(BaseRachaTestCase):

    def test_criar_racha_torna_criador_admin_e_jogador(self):
        resp = self.como(self.estranho).post('/api/v1/rachas/', {
            'nome': 'Pelada de Sábado', 'ponto_gol': 2, 'ponto_assistencia': 1, 'ponto_presenca': 1,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(len(resp.data['codigo_convite']), 5)
        racha = Racha.objects.get(id=resp.data['id'])
        self.assertIn(self.estranho, racha.administrador.all())
        self.assertTrue(JogadoresRacha.objects.filter(racha=racha, jogador=self.estranho).exists())

    def test_listagem_nao_vaza_rachas_de_terceiros(self):
        resp = self.como(self.estranho).get('/api/v1/rachas/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        dados = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        self.assertEqual([r['codigo_convite'] for r in dados], [])

    def test_meus_rachas(self):
        resp = self.como(self.jogador).get('/api/v1/rachas/meus_rachas/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertFalse(resp.data[0]['is_admin'])

    def test_estranho_nao_ve_detalhe(self):
        resp = self.como(self.estranho).get(f'/api/v1/rachas/{self.racha.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_jogador_ve_detalhe_com_premios(self):
        resp = self.como(self.jogador).get(f'/api/v1/rachas/{self.racha.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['premios']), 1)

    def test_jogador_nao_edita_racha(self):
        resp = self.como(self.jogador).patch(f'/api/v1/rachas/{self.racha.id}/', {'nome': 'X'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_edita_racha(self):
        resp = self.como(self.admin).patch(f'/api/v1/rachas/{self.racha.id}/', {'nome': 'Novo Nome'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['nome'], 'Novo Nome')

    def test_admin_nao_pode_remover_todos_os_administradores(self):
        resp = self.como(self.admin).patch(
            f'/api/v1/rachas/{self.racha.id}/', {'administradores_ids': []}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(self.admin, self.racha.administrador.all())

    def test_admin_so_promove_membros_do_racha(self):
        resp = self.como(self.admin).patch(
            f'/api/v1/rachas/{self.racha.id}/',
            {'administradores_ids': [str(self.admin.id), str(self.estranho.id)]}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_altera_status_de_jogador(self):
        resp = self.como(self.admin).post(f'/api/v1/rachas/{self.racha.id}/alterar_status_jogador/', {
            'jogador_id': str(self.jogador.id), 'ativo': False,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(JogadoresRacha.objects.get(racha=self.racha, jogador=self.jogador).ativo)

    def test_jogador_nao_altera_status(self):
        resp = self.como(self.jogador).post(f'/api/v1/rachas/{self.racha.id}/alterar_status_jogador/', {
            'jogador_id': str(self.admin.id), 'ativo': False,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_ranking_calcula_pontuacao(self):
        # jogador: 2 gols, 1 presença, 1 prêmio (5) => 2*3 + 1*1 + 5 = 12
        # admin:   1 assistência, 1 presença          => 1*2 + 1*1     = 3
        JogadorPartida.objects.create(partida=self.partida, jogador=self.jogador)
        JogadorPartida.objects.create(partida=self.partida, jogador=self.admin)
        RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.jogador, jogador_assistencia=self.admin)
        RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.jogador)
        PremioPartida.objects.create(partida=self.partida, premio=self.premio, jogador=self.jogador)

        resp = self.como(self.jogador).get(f'/api/v1/rachas/{self.racha.id}/ranking/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]['jogador_username'], 'jogador')
        self.assertEqual(resp.data[0]['pontuacao_total'], 12)
        self.assertEqual(resp.data[0]['premios'], 1)
        self.assertEqual(resp.data[1]['pontuacao_total'], 3)

        art = self.como(self.jogador).get(f'/api/v1/rachas/{self.racha.id}/ranking_artilheiros/')
        self.assertEqual(art.data[0]['gols'], 2)
        ass = self.como(self.jogador).get(f'/api/v1/rachas/{self.racha.id}/ranking_assistencias/')
        self.assertEqual(ass.data[0]['assistencias'], 1)

    def test_estatisticas_por_partida(self):
        JogadorPartida.objects.create(partida=self.partida, jogador=self.jogador)
        RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.jogador)
        resp = self.como(self.jogador).get(f'/api/v1/rachas/{self.racha.id}/estatisticas/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['totais']['gols'], 1)
        self.assertEqual(resp.data['totais']['partidas'], 1)
        self.assertEqual(len(resp.data['por_partida']), 1)
        self.assertEqual(resp.data['por_partida'][0]['gols'], 1)


# ---------------------------------------------------------------------------
# Solicitações de entrada
# ---------------------------------------------------------------------------
class SolicitacaoTests(BaseRachaTestCase):

    def pedir(self, user):
        return self.como(user).post('/api/v1/solicitacoes/', {'codigo_convite': self.racha.codigo_convite}, format='json')

    def test_fluxo_pedir_e_aprovar(self):
        resp = self.pedir(self.estranho)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.pedir(self.estranho).status_code, status.HTTP_400_BAD_REQUEST)

        recebidas = self.como(self.admin).get('/api/v1/solicitacoes/')
        lista = recebidas.data['results'] if isinstance(recebidas.data, dict) else recebidas.data
        self.assertEqual(len(lista), 1)

        aprov = self.como(self.admin).post(f"/api/v1/solicitacoes/{resp.data['id']}/aprovar/")
        self.assertEqual(aprov.status_code, status.HTTP_200_OK)
        self.assertTrue(JogadoresRacha.objects.filter(racha=self.racha, jogador=self.estranho, ativo=True).exists())

    def test_codigo_minusculo_funciona(self):
        resp = self.como(self.estranho).post(
            '/api/v1/solicitacoes/', {'codigo_convite': f' {self.racha.codigo_convite.lower()} '}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_codigo_inexistente_retorna_404(self):
        resp = self.como(self.estranho).post('/api/v1/solicitacoes/', {'codigo_convite': 'ZZZZZ'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_negar_duas_vezes_nao_quebra(self):
        for _ in range(2):
            resp = self.pedir(self.estranho)
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
            negar = self.como(self.admin).post(f"/api/v1/solicitacoes/{resp.data['id']}/negar/")
            self.assertEqual(negar.status_code, status.HTTP_200_OK)

    def test_jogador_removido_pode_voltar(self):
        JogadoresRacha.objects.filter(racha=self.racha, jogador=self.jogador).update(ativo=False)
        resp = self.pedir(self.jogador)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.como(self.admin).post(f"/api/v1/solicitacoes/{resp.data['id']}/aprovar/")
        self.assertTrue(JogadoresRacha.objects.get(racha=self.racha, jogador=self.jogador).ativo)

    def test_solicitante_nao_aprova_a_propria(self):
        resp = self.pedir(self.estranho)
        aprov = self.como(self.estranho).post(f"/api/v1/solicitacoes/{resp.data['id']}/aprovar/")
        self.assertIn(aprov.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))
        self.assertFalse(JogadoresRacha.objects.filter(racha=self.racha, jogador=self.estranho).exists())

    def test_solicitante_nao_altera_status_via_patch(self):
        resp = self.pedir(self.estranho)
        patch = self.como(self.estranho).patch(
            f"/api/v1/solicitacoes/{resp.data['id']}/?tipo=enviadas", {'status': 'ACEITO'}, format='json')
        self.assertIn(patch.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED))
        self.assertEqual(SolicitacaoRacha.objects.get(id=resp.data['id']).status, 'PENDENTE')

    def test_enviadas_trazem_nome_do_racha(self):
        self.pedir(self.estranho)
        resp = self.como(self.estranho).get('/api/v1/solicitacoes/?tipo=enviadas')
        lista = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        self.assertEqual(lista[0]['racha']['nome'], 'Racha da Quinta')


# ---------------------------------------------------------------------------
# Partidas
# ---------------------------------------------------------------------------
class PartidaTests(BaseRachaTestCase):

    def url(self, acao=''):
        return f'/api/v1/partidas/{self.partida.id}/{acao + "/" if acao else ""}'

    def test_admin_cria_partida_com_data(self):
        resp = self.como(self.admin).post('/api/v1/partidas/', {
            'racha': str(self.racha.id), 'data_inicio': '2026-10-03T08:00:00-03:00', 'local': 'Arena', 'horario': '08:00',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertIsNotNone(resp.data['data_inicio'])

    def test_jogador_nao_cria_partida(self):
        resp = self.como(self.jogador).post('/api/v1/partidas/', {'racha': str(self.racha.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_listagem_retorna_todas_as_partidas(self):
        for _ in range(25):
            Partida.objects.create(racha=self.racha)
        resp = self.como(self.jogador).get(f'/api/v1/partidas/?racha={self.racha.id}')
        lista = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(lista), 26)

    def test_estranho_nao_ve_partida(self):
        resp = self.como(self.estranho).get(self.url())
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_fluxo_completo_de_partida(self):
        admin = self.como(self.admin)
        resp = admin.post(self.url('adicionar_jogador'), {
            'jogadores_ids': [str(self.admin.id), str(self.jogador.id), str(self.estranho.id)]}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['jogadores']), 2)
        self.assertEqual(len(resp.data['erros']), 1)

        gol = admin.post(self.url('registrar_gol'), {
            'jogador_gol_id': str(self.jogador.id), 'jogador_assistencia_id': str(self.admin.id)}, format='json')
        self.assertEqual(gol.status_code, status.HTTP_201_CREATED)

        premio = admin.post(self.url('associar_premio'), {
            'jogador_id': str(self.jogador.id), 'premio_id': str(self.premio.id)}, format='json')
        self.assertEqual(premio.status_code, status.HTTP_201_CREATED)

        detalhe = self.como(self.jogador).get(self.url())
        self.assertEqual(detalhe.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detalhe.data['registros']), 1)
        self.assertEqual(len(detalhe.data['premios_partida']), 1)
        self.assertFalse(detalhe.data['racha_is_admin'])

        fim = admin.post(self.url('finalizar'))
        self.assertEqual(fim.status_code, status.HTTP_200_OK)
        self.assertFalse(fim.data['status'])
        self.assertTrue(fim.data['racha_is_admin'])

    def test_editar_registro_retorna_200(self):
        reg = RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.jogador)
        resp = self.como(self.admin).put(self.url('editar_registro'), {
            'registro_id': str(reg.id), 'jogador_gol_id': str(self.admin.id),
            'jogador_assistencia_id': str(self.jogador.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        reg.refresh_from_db()
        self.assertEqual(reg.jogador_gol, self.admin)
        self.assertEqual(reg.jogador_assistencia, self.jogador)

    def test_editar_registro_para_gol_anonimo(self):
        reg = RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.jogador,
                                             jogador_assistencia=self.admin)
        resp = self.como(self.admin).put(self.url('editar_registro'), {
            'registro_id': str(reg.id), 'jogador_gol_id': None,
            'jogador_assistencia_id': str(self.admin.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        reg.refresh_from_db()
        self.assertIsNone(reg.jogador_gol)

    def test_registrar_presenca(self):
        resp = self.como(self.admin).post(self.url('registrar_presenca'), {
            'jogador_id': str(self.jogador.id), 'presente': False}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(JogadorPartida.objects.get(partida=self.partida, jogador=self.jogador).presente)

    def test_gol_nao_identificado(self):
        resp = self.como(self.admin).post(self.url('registrar_gol'), {'jogador_gol_id': None}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertIsNone(resp.data['jogador_gol'])
        stats = self.como(self.jogador).get(f'/api/v1/rachas/{self.racha.id}/estatisticas/')
        self.assertEqual(stats.data['totais']['gols'], 1)

    def test_gol_exige_jogador_do_racha(self):
        resp = self.como(self.admin).post(self.url('registrar_gol'), {
            'jogador_gol_id': str(self.estranho.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_gol_e_assistencia_nao_podem_ser_o_mesmo(self):
        resp = self.como(self.admin).post(self.url('registrar_gol'), {
            'jogador_gol_id': str(self.jogador.id), 'jogador_assistencia_id': str(self.jogador.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_jogador_comum_nao_gerencia_partida(self):
        jogador = self.como(self.jogador)
        reg = RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.admin)
        tentativas = [
            jogador.post(self.url('registrar_gol'), {'jogador_gol_id': str(self.jogador.id)}, format='json'),
            jogador.post(self.url('adicionar_jogador'), {'jogador_id': str(self.jogador.id)}, format='json'),
            jogador.post(self.url('registrar_presenca'), {'jogador_id': str(self.jogador.id)}, format='json'),
            jogador.post(self.url('associar_premio'), {
                'jogador_id': str(self.jogador.id), 'premio_id': str(self.premio.id)}, format='json'),
            jogador.delete(self.url('remover_registro'), {'registro_id': str(reg.id)}, format='json'),
            jogador.put(self.url('editar_registro'), {'registro_id': str(reg.id),
                                                      'jogador_gol_id': str(self.jogador.id)}, format='json'),
            jogador.patch(self.url(), {'local': 'Outro'}, format='json'),
            jogador.delete(self.url()),
        ]
        for resp in tentativas:
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN, resp.wsgi_request.path)
        self.assertEqual(RegistroPartida.objects.filter(partida=self.partida).count(), 1)
        self.assertTrue(Partida.objects.filter(id=self.partida.id).exists())

    def test_admin_exclui_partida(self):
        resp = self.como(self.admin).delete(self.url())
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Prêmios
# ---------------------------------------------------------------------------
class PremioTests(BaseRachaTestCase):

    def test_admin_cria_edita_exclui(self):
        admin = self.como(self.admin)
        resp = admin.post('/api/v1/premios/', {'racha': str(self.racha.id), 'nome': 'Bola Murcha', 'valor_pontos': 1},
                          format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        pid = resp.data['id']
        self.assertEqual(admin.patch(f'/api/v1/premios/{pid}/', {'valor_pontos': 2}, format='json').status_code, 200)
        self.assertEqual(admin.delete(f'/api/v1/premios/{pid}/').status_code, 204)

    def test_jogador_nao_cria_premio(self):
        resp = self.como(self.jogador).post('/api/v1/premios/', {
            'racha': str(self.racha.id), 'nome': 'Auto Prêmio', 'valor_pontos': 99}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_jogador_lista_premios_do_racha(self):
        resp = self.como(self.jogador).get(f'/api/v1/premios/?racha={self.racha.id}')
        lista = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(lista), 1)

    def test_admin_nao_move_premio_para_racha_alheio(self):
        outro = Racha.objects.create(nome='Outro')
        outro.administrador.add(self.estranho)
        resp = self.como(self.admin).patch(f'/api/v1/premios/{self.premio.id}/', {'racha': str(outro.id)},
                                           format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_premio_de_outro_racha_rejeitado_na_partida(self):
        outro = Racha.objects.create(nome='Outro')
        premio_alheio = Premio.objects.create(racha=outro, nome='Alheio', valor_pontos=50)
        resp = self.como(self.admin).post(f'/api/v1/partidas/{self.partida.id}/associar_premio/', {
            'jogador_id': str(self.jogador.id), 'premio_id': str(premio_alheio.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Dashboard, ranking global e imagens
# ---------------------------------------------------------------------------
class DashboardTests(BaseRachaTestCase):

    def test_dashboard(self):
        JogadorPartida.objects.create(partida=self.partida, jogador=self.jogador)
        RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.jogador, jogador_assistencia=self.admin)
        resp = self.como(self.jogador).get('/api/v1/usuarios/dashboard/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['gols'], 1)
        self.assertEqual(resp.data['partidas_count'], 1)
        self.assertEqual(resp.data['melhor_garcom']['nome'], 'Admin Silva')
        self.assertIn('data_criacao', resp.data)
        self.assertEqual(len(resp.data['historico']), 1)

    def test_ranking_global(self):
        RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.jogador, jogador_assistencia=self.admin)
        RegistroPartida.objects.create(partida=self.partida, jogador_gol=self.jogador)
        resp = self.como(self.estranho).get('/api/v1/usuarios/ranking_global/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]['jogador_username'], 'jogador')
        self.assertEqual(resp.data[0]['pontos'], 2)
        self.assertEqual(resp.data[1]['pontos'], 1)

    @override_settings(BASE_URL_IMAGES='http://api.local/media/')
    def test_url_de_imagem_local_absoluta(self):
        self.jogador.imagem_perfil.name = 'perfis/foto.jpg'
        self.jogador.save()
        resp = self.como(self.jogador).get('/api/v1/usuarios/me/')
        self.assertEqual(resp.data['imagem_perfil'], 'http://api.local/media/perfis/foto.jpg')


# ---------------------------------------------------------------------------
# Recuperação de senha
# ---------------------------------------------------------------------------
@override_settings(FRONTEND_URL='https://app.rachapp.test')
class RecuperacaoSenhaTests(APITestCase):

    def setUp(self):
        self.user = criar_usuario('esquecido', email='esquecido@teste.com')

    def test_link_aponta_para_frontend_e_confirma(self):
        resp = self.client.post('/api/auth/password/reset/', {'email': 'esquecido@teste.com'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        corpo = mail.outbox[0].body
        match = re.search(r'https://app\.rachapp\.test/redefinir-senha/([^/\s]+)/([^/\s]+)', corpo)
        self.assertIsNotNone(match, corpo)
        uid, token = match.groups()

        confirm = self.client.post('/api/auth/password/reset/confirm/', {
            'uid': uid, 'token': token,
            'new_password1': 'NovaSenha#2026', 'new_password2': 'NovaSenha#2026',
        }, format='json')
        self.assertEqual(confirm.status_code, status.HTTP_200_OK, confirm.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NovaSenha#2026'))

    def test_token_gerado_pelo_admin_e_aceito(self):
        from django.contrib.admin.sites import site
        from django.test import RequestFactory
        from django.contrib.messages.storage.fallback import FallbackStorage
        from .admin import UserAdmin

        request = RequestFactory().post('/admin/')
        request.user = criar_usuario('staff', is_staff=True, is_superuser=True)
        request.session = {}
        request._messages = FallbackStorage(request)
        UserAdmin(User, site).enviar_email_redefinicao_senha(request, User.objects.filter(id=self.user.id))

        match = re.search(r'/redefinir-senha/([^/\s]+)/([^/\s]+)', mail.outbox[0].body)
        uid, token = match.groups()
        confirm = self.client.post('/api/auth/password/reset/confirm/', {
            'uid': uid, 'token': token,
            'new_password1': 'NovaSenha#2026', 'new_password2': 'NovaSenha#2026',
        }, format='json')
        self.assertEqual(confirm.status_code, status.HTTP_200_OK, confirm.data)
