"""
Testes de integração da rede social (API completa via APIClient).

Cada teste descreve um fluxo usado pelo frontend: amizades, busca entre rachas,
posts com foto/vídeo, reels, visibilidade, curtidas, comentários, compartilhamento,
menções, perfil com estatísticas e notificações.
"""
import shutil
import tempfile
import uuid
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from rachas.models import JogadoresRacha, JogadorPartida, Partida, Premio, PremioPartida, Racha, RegistroPartida

from .models import Amizade, Notificacao, Post

User = get_user_model()
MEDIA_TEMP = tempfile.mkdtemp(prefix='social-test-media-')

PNG_1PX = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
    b'\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
)


def criar_usuario(username, **extra):
    dados = {
        'email': f'{username}@teste.com', 'password': 'SenhaForte#2026', 'first_name': username.capitalize(),
        'last_name': 'Silva', 'posicao': 'ATACANTE', 'auth_uid': str(uuid.uuid4()),
    }
    dados.update(extra)
    return User.objects.create_user(username=username, **dados)


def imagem(nome='foto.png'):
    return SimpleUploadedFile(nome, PNG_1PX, content_type='image/png')


def video(nome='lance.mp4'):
    return SimpleUploadedFile(nome, b'\x00\x00\x00\x18ftypmp42' + b'0' * 64, content_type='video/mp4')


@override_settings(MEDIA_ROOT=MEDIA_TEMP)
class SocialBase(APITestCase):
    URL = '/api/v1/social/'

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TEMP, ignore_errors=True)

    def setUp(self):
        self.ana = criar_usuario('ana', first_name='Ana', last_name='Souza')
        self.beto = criar_usuario('beto', first_name='Beto', last_name='Lima')
        self.caio = criar_usuario('caio', first_name='Caio', last_name='Ramos')

    def como(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def amigos(self, a, b):
        return Amizade.objects.create(solicitante=a, destinatario=b, status=Amizade.ACEITA)

    def postar(self, user, texto='Bora jogar!', **extra):
        res = self.como(user).post(self.URL + 'posts/', {'texto': texto, **extra}, format='multipart')
        self.assertEqual(res.status_code, 201, res.data)
        return res.data


class AutenticacaoTests(SocialBase):
    def test_rotas_exigem_login(self):
        for rota in ('posts/', 'usuarios/', 'amizades/', 'notificacoes/', 'resumo/', 'perfis/ana/'):
            self.assertEqual(APIClient().get(self.URL + rota).status_code, 401, rota)


class AmizadeTests(SocialBase):
    def test_pedido_aceite_e_notificacoes(self):
        res = self.como(self.ana).post(self.URL + 'amizades/', {'usuario_id': str(self.beto.id)}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['amizade'], 'enviada')
        self.assertTrue(Notificacao.objects.filter(destinatario=self.beto, tipo=Notificacao.AMIZADE_PEDIDO).exists())

        lista_beto = self.como(self.beto).get(self.URL + 'amizades/').data
        self.assertEqual([u['username'] for u in lista_beto['recebidas']], ['ana'])
        self.assertEqual(self.como(self.beto).get(self.URL + 'resumo/').data['pedidos_amizade'], 1)

        aceitar = self.como(self.beto).post(self.URL + f"amizades/{res.data['amizade_id']}/aceitar/")
        self.assertEqual(aceitar.data['amizade'], 'amigos')
        self.assertTrue(Notificacao.objects.filter(destinatario=self.ana, tipo=Notificacao.AMIZADE_ACEITA).exists())
        self.assertEqual([u['username'] for u in self.como(self.ana).get(self.URL + 'amizades/').data['amigos']], ['beto'])

    def test_pedido_cruzado_vira_amizade(self):
        self.como(self.ana).post(self.URL + 'amizades/', {'usuario_id': str(self.beto.id)}, format='json')
        res = self.como(self.beto).post(self.URL + 'amizades/', {'usuario_id': str(self.ana.id)}, format='json')
        self.assertEqual(res.data['amizade'], 'amigos')
        self.assertEqual(Amizade.objects.count(), 1)

    def test_regras_de_pedido(self):
        self.assertEqual(self.como(self.ana).post(self.URL + 'amizades/', {'usuario_id': str(self.ana.id)}, format='json').status_code, 400)
        self.como(self.ana).post(self.URL + 'amizades/', {'usuario_id': str(self.beto.id)}, format='json')
        self.assertEqual(self.como(self.ana).post(self.URL + 'amizades/', {'usuario_id': str(self.beto.id)}, format='json').status_code, 400)
        amizade = Amizade.objects.get()
        # Só o destinatário aceita
        self.assertEqual(self.como(self.ana).post(self.URL + f'amizades/{amizade.id}/aceitar/').status_code, 404)
        self.assertEqual(self.como(self.caio).delete(self.URL + f'amizades/{amizade.id}/').status_code, 404)

    def test_recusar_cancelar_e_desfazer(self):
        amizade = Amizade.objects.create(solicitante=self.ana, destinatario=self.beto)
        self.assertEqual(self.como(self.beto).delete(self.URL + f'amizades/{amizade.id}/').status_code, 204)
        amizade = self.amigos(self.ana, self.beto)
        self.assertEqual(self.como(self.ana).delete(self.URL + f'amizades/{amizade.id}/').status_code, 204)
        self.assertFalse(Amizade.objects.exists())


class BuscaEPerfilTests(SocialBase):
    def test_busca_em_todos_os_rachas_com_situacao(self):
        self.amigos(self.ana, self.beto)
        res = self.como(self.ana).get(self.URL + 'usuarios/', {'q': 'ra'})  # "Caio Ramos"
        self.assertEqual([(u['username'], u['amizade']) for u in res.data], [('caio', 'nenhuma')])
        res = self.como(self.ana).get(self.URL + 'usuarios/', {'q': '@beto'})
        self.assertEqual(res.data[0]['amizade'], 'amigos')
        res = self.como(self.ana).get(self.URL + 'usuarios/', {'q': 'Caio Ramos'})
        self.assertEqual(res.data[0]['username'], 'caio')

    def test_sugestoes_sao_colegas_de_racha_ainda_nao_amigos(self):
        racha = Racha.objects.create(nome='Quinta')
        for u in (self.ana, self.beto, self.caio):
            JogadoresRacha.objects.create(racha=racha, jogador=u)
        self.amigos(self.ana, self.beto)
        res = self.como(self.ana).get(self.URL + 'usuarios/')
        self.assertEqual([u['username'] for u in res.data], ['caio'])

    def test_perfil_com_estatisticas_de_todos_os_rachas(self):
        r1, r2 = Racha.objects.create(nome='Quinta'), Racha.objects.create(nome='Sábado')
        for racha in (r1, r2):
            JogadoresRacha.objects.create(racha=racha, jogador=self.beto)
            partida = Partida.objects.create(racha=racha)
            JogadorPartida.objects.create(partida=partida, jogador=self.beto)
            RegistroPartida.objects.create(partida=partida, jogador_gol=self.beto, jogador_assistencia=self.ana)
        premio = Premio.objects.create(racha=r1, nome='Craque', valor_pontos=3)
        PremioPartida.objects.create(partida=Partida.objects.filter(racha=r1).first(), premio=premio, jogador=self.beto)
        self.postar(self.beto)

        res = self.como(self.ana).get(self.URL + 'perfis/BETO/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['estatisticas'], {'gols': 2, 'assistencias': 0, 'jogos': 2, 'rachas': 2, 'premios': 1})
        self.assertEqual(res.data['social']['posts'], 1)
        self.assertEqual(res.data['amizade'], 'nenhuma')
        self.assertEqual(self.como(self.beto).get(self.URL + 'perfis/beto/').data['amizade'], 'eu')
        self.assertEqual(self.como(self.ana).get(self.URL + 'perfis/naoexiste/').status_code, 404)


class PostTests(SocialBase):
    def test_post_de_texto_e_validacoes(self):
        post = self.postar(self.ana, 'Golaço hoje!')
        self.assertEqual((post['autor']['username'], post['formato'], post['total_curtidas']), ('ana', 'POST', 0))
        self.assertTrue(post['pode_excluir'])
        vazio = self.como(self.ana).post(self.URL + 'posts/', {'texto': '   '}, format='multipart')
        self.assertEqual(vazio.status_code, 400)

    def test_post_com_foto_e_reel_com_video(self):
        foto = self.postar(self.ana, 'Time campeão', midia=imagem())
        self.assertEqual(foto['tipo_midia'], 'IMAGEM')
        self.assertTrue(foto['midia_url'])
        reel = self.postar(self.ana, 'Lance do jogo', midia=video(), formato='REEL')
        self.assertEqual((reel['tipo_midia'], reel['formato']), ('VIDEO', 'REEL'))

    def test_midia_invalida(self):
        txt = SimpleUploadedFile('nota.txt', b'oi', content_type='text/plain')
        self.assertEqual(self.como(self.ana).post(self.URL + 'posts/', {'midia': txt}, format='multipart').status_code, 400)
        falso = SimpleUploadedFile('foto.png', b'oi', content_type='text/plain')
        self.assertEqual(self.como(self.ana).post(self.URL + 'posts/', {'midia': falso}, format='multipart').status_code, 400)
        reel_foto = self.como(self.ana).post(self.URL + 'posts/', {'midia': imagem(), 'formato': 'REEL'}, format='multipart')
        self.assertEqual(reel_foto.status_code, 400)
        with mock.patch('social.serializers.MAX_IMAGEM_MB', 0):
            grande = self.como(self.ana).post(self.URL + 'posts/', {'midia': imagem()}, format='multipart')
        self.assertEqual(grande.status_code, 400)
        self.assertIn('Limite', str(grande.data))

    def test_so_o_autor_apaga(self):
        post = self.postar(self.ana)
        self.assertEqual(self.como(self.beto).delete(self.URL + f"posts/{post['id']}/").status_code, 403)
        self.assertEqual(self.como(self.ana).delete(self.URL + f"posts/{post['id']}/").status_code, 204)
        self.assertEqual(self.como(self.ana).get(self.URL + f"posts/{post['id']}/").status_code, 404)


class FeedEVisibilidadeTests(SocialBase):
    def setUp(self):
        super().setUp()
        self.amigos(self.ana, self.beto)
        self.p_beto_publico = self.postar(self.beto, 'Público do Beto')
        self.p_beto_amigos = self.postar(self.beto, 'Só amigos do Beto', visibilidade='AMIGOS')
        self.p_caio = self.postar(self.caio, 'Público do Caio')
        self.p_caio_amigos = self.postar(self.caio, 'Só amigos do Caio', visibilidade='AMIGOS')
        self.reel = self.postar(self.caio, 'Reel do Caio', midia=video(), formato='REEL')

    def textos(self, user, **params):
        return [p['texto'] for p in self.como(user).get(self.URL + 'posts/', params).data['results']]

    def test_feed_de_amigos(self):
        self.assertEqual(set(self.textos(self.ana, feed='amigos')), {'Público do Beto', 'Só amigos do Beto'})

    def test_explorar_mostra_publicos_de_todos(self):
        self.assertEqual(set(self.textos(self.ana, feed='explorar')), {'Público do Beto', 'Público do Caio', 'Reel do Caio'})

    def test_reels(self):
        self.assertEqual(self.textos(self.ana, feed='reels'), ['Reel do Caio'])

    def test_post_so_amigos_e_invisivel_para_quem_nao_e_amigo(self):
        self.assertEqual(self.como(self.ana).get(self.URL + f"posts/{self.p_caio_amigos['id']}/").status_code, 404)
        self.assertEqual(self.como(self.ana).post(self.URL + f"posts/{self.p_caio_amigos['id']}/curtir/").status_code, 404)
        self.assertEqual(set(self.textos(self.ana, autor='caio')), {'Público do Caio', 'Reel do Caio'})
        self.assertEqual(set(self.textos(self.beto, autor='caio')), {'Público do Caio', 'Reel do Caio'})
        self.amigos(self.ana, self.caio)
        self.assertIn('Só amigos do Caio', self.textos(self.ana, autor='caio'))

    def test_feed_invalido_e_paginacao(self):
        self.assertEqual(self.como(self.ana).get(self.URL + 'posts/', {'feed': 'xyz'}).status_code, 400)
        res = self.como(self.ana).get(self.URL + 'posts/', {'feed': 'explorar', 'tamanho': 2})
        self.assertEqual(len(res.data['results']), 2)
        self.assertIsNotNone(res.data['next'])


class InteracaoTests(SocialBase):
    def setUp(self):
        super().setUp()
        self.post = self.postar(self.ana, 'Foto do jogo', midia=imagem())
        self.url_post = self.URL + f"posts/{self.post['id']}/"

    def test_curtir_e_descurtir(self):
        res = self.como(self.beto).post(self.url_post + 'curtir/')
        self.assertEqual((res.data['curtido'], res.data['total_curtidas']), (True, 1))
        self.como(self.beto).post(self.url_post + 'curtir/')  # idempotente
        self.como(self.caio).post(self.url_post + 'curtir/')
        detalhe = self.como(self.beto).get(self.url_post).data
        self.assertEqual((detalhe['total_curtidas'], detalhe['curtido']), (2, True))
        self.como(self.beto).delete(self.url_post + 'curtir/')
        self.como(self.beto).post(self.url_post + 'curtir/')
        # Curtir de novo não duplica a notificação
        self.assertEqual(Notificacao.objects.filter(destinatario=self.ana, ator=self.beto, tipo='CURTIDA').count(), 1)
        self.assertEqual(self.como(self.ana).get(self.url_post).data['total_curtidas'], 2)

    def test_comentarios_com_mencao_e_exclusao(self):
        res = self.como(self.beto).post(self.url_post + 'comentarios/', {'texto': 'Boa, @caio olha isso!'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['mencoes'], [{'id': str(self.caio.id), 'username': 'caio'}])
        self.assertTrue(Notificacao.objects.filter(destinatario=self.ana, tipo='COMENTARIO').exists())
        self.assertTrue(Notificacao.objects.filter(destinatario=self.caio, tipo='MENCAO').exists())
        lista = self.como(self.caio).get(self.url_post + 'comentarios/').data
        self.assertEqual(len(lista), 1)
        self.assertFalse(lista[0]['pode_excluir'])
        self.assertEqual(self.como(self.ana).get(self.url_post).data['total_comentarios'], 1)

        comentario = self.URL + f"comentarios/{res.data['id']}/"
        self.assertEqual(self.como(self.caio).delete(comentario).status_code, 403)
        self.assertEqual(self.como(self.ana).delete(comentario).status_code, 204)  # dono do post pode apagar
        vazio = self.como(self.beto).post(self.url_post + 'comentarios/', {'texto': ''}, format='json')
        self.assertEqual(vazio.status_code, 400)

    def test_mencoes_no_post(self):
        post = self.postar(self.beto, 'Valeu @ana e @CAIO! email@teste.com e @fantasma')
        self.assertEqual({m['username'] for m in post['mencoes']}, {'ana', 'caio'})
        self.assertEqual(Notificacao.objects.filter(tipo='MENCAO', post_id=post['id']).count(), 2)
        privado = self.postar(self.beto, 'Só pros amigos @caio', visibilidade='AMIGOS')
        # Caio não é amigo de Beto: é citado, mas não é notificado de um post que não pode ver
        self.assertFalse(Notificacao.objects.filter(destinatario=self.caio, post_id=privado['id']).exists())

    def test_compartilhar(self):
        res = self.como(self.beto).post(self.url_post + 'compartilhar/', {'texto': 'Olha isso @caio'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['eh_compartilhamento'])
        self.assertEqual(res.data['original']['id'], self.post['id'])
        self.assertTrue(Notificacao.objects.filter(destinatario=self.ana, tipo='COMPARTILHAMENTO').exists())
        # Compartilhar um compartilhamento aponta para o original
        de_novo = self.como(self.caio).post(self.URL + f"posts/{res.data['id']}/compartilhar/", {}, format='json')
        self.assertEqual(de_novo.data['original']['id'], self.post['id'])
        self.assertEqual(self.como(self.ana).get(self.url_post).data['total_compartilhamentos'], 2)
        # Original apagado: o compartilhamento continua, sem o conteúdo
        self.como(self.ana).delete(self.url_post)
        self.assertIsNone(self.como(self.beto).get(self.URL + f"posts/{res.data['id']}/").data['original'])

    def test_nao_compartilha_post_so_de_amigos(self):
        self.amigos(self.ana, self.beto)
        privado = self.postar(self.ana, 'Privado', visibilidade='AMIGOS')
        res = self.como(self.beto).post(self.URL + f"posts/{privado['id']}/compartilhar/", {}, format='json')
        self.assertEqual(res.status_code, 400)


class NotificacaoTests(SocialBase):
    def test_listar_e_marcar_como_lidas(self):
        post = self.postar(self.ana)
        self.como(self.beto).post(self.URL + f"posts/{post['id']}/curtir/")
        self.como(self.caio).post(self.URL + f"posts/{post['id']}/comentarios/", {'texto': 'Top'}, format='json')
        res = self.como(self.ana).get(self.URL + 'notificacoes/').data
        self.assertEqual(res['nao_lidas'], 2)
        self.assertEqual([n['tipo'] for n in res['itens']], ['COMENTARIO', 'CURTIDA'])
        self.assertEqual(res['itens'][0]['comentario_texto'], 'Top')
        self.assertEqual(self.como(self.ana).get(self.URL + 'resumo/').data['notificacoes_nao_lidas'], 2)
        self.assertEqual(self.como(self.ana).post(self.URL + 'notificacoes/ler/').data['marcadas'], 2)
        self.assertEqual(self.como(self.ana).get(self.URL + 'notificacoes/').data['nao_lidas'], 0)
        # Ninguém vê notificações dos outros
        self.assertEqual(self.como(self.beto).get(self.URL + 'notificacoes/').data['itens'], [])
