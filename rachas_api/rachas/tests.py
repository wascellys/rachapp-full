from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
import uuid

from .models import Racha, JogadoresRacha, Premio, Partida, SolicitacaoRacha

User = get_user_model()


class UserAPITestCase(APITestCase):
    """Testes para a API de usuários"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'data_nascimento': '1990-01-01',
            'posicao': 'ATACANTE',
            'auth_uid': str(uuid.uuid4())
        }
        
        self.user = User.objects.create_user(**self.user_data)
    
    def test_user_me_endpoint(self):
        """Testa endpoint /me/ para retornar dados do usuário autenticado"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/usuarios/me/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')


class RachaAPITestCase(APITestCase):
    """Testes para a API de rachas"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='pass123',
            data_nascimento='1990-01-01',
            posicao='GOLEIRO',
            auth_uid=str(uuid.uuid4())
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_racha(self):
        """Testa criação de um racha"""
        data = {
            'nome': 'Racha da Quinta',
            'ponto_gol': 2,
            'ponto_assistencia': 1,
            'ponto_presenca': 1,
        }
        response = self.client.post('/api/v1/rachas/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nome'], 'Racha da Quinta')
        self.assertEqual(response.data['administrador']['username'], 'admin')
        self.assertIsNotNone(response.data['codigo_convite'])


class PremioAPITestCase(APITestCase):
    """Testes para a API de prêmios"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='pass123',
            data_nascimento='1990-01-01',
            posicao='GOLEIRO',
            auth_uid=str(uuid.uuid4())
        )
        self.client.force_authenticate(user=self.user)
        
        self.racha = Racha.objects.create(
            administrador=self.user,
            nome='Racha Teste',
            ponto_gol=2,
            ponto_assistencia=1,
            ponto_presenca=1
        )
    
    def test_create_premio(self):
        """Testa criação de um prêmio"""
        data = {
            'racha': str(self.racha.id),
            'nome': 'Melhor Jogador',
            'valor_pontos': 5,
            'ativo': True
        }
        response = self.client.post('/api/v1/premios/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nome'], 'Melhor Jogador')
        self.assertEqual(response.data['valor_pontos'], 5)
