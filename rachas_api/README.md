# API Django para Gerenciamento de Rachas (Peladas de Futebol)

Uma **API REST completa** desenvolvida com **Python + Django + Django REST Framework** para gerenciar rachas (peladas) de futebol com autenticação, gerenciamento de jogadores, partidas, pontuação e ranking.

## 🎯 Características Principais

✅ **Autenticação Completa** - JWT, Google, Facebook e e-mail/telefone
✅ **Gerenciamento de Rachas** - Criar, editar, listar e encerrar rachas
✅ **Sistema de Jogadores** - Registro, posições, perfis com imagens
✅ **Solicitações de Entrada** - Controle de acesso com aprovação de admin
✅ **Partidas e Eventos** - Registro de gols, assistências e presença
✅ **Sistema de Prêmios** - Prêmios customizáveis por racha
✅ **Ranking Dinâmico** - Pontuação calculada automaticamente
✅ **Documentação Automática** - Swagger/Redoc integrado
✅ **Testes Unitários** - Cobertura completa de funcionalidades

---

## 📋 Requisitos Técnicos

- **Python 3.10+**
- **Django 5.2+**
- **Django REST Framework 3.16+**
- **PostgreSQL** (ou SQLite para desenvolvimento)
- **Pillow** (processamento de imagens)

---

## 🚀 Instalação e Configuração

### 1. Clonar o Repositório

```bash
git clone <seu-repositorio>
cd rachas_api
```

### 2. Criar Ambiente Virtual

```bash
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

### 3. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 4. Configurar Banco de Dados

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Criar Superusuário

```bash
python manage.py createsuperuser
```

### 6. Executar Servidor

```bash
python manage.py runserver
```

A API estará disponível em `http://localhost:8000/`

---

## 📚 Documentação de Endpoints

### Base URL
```
http://localhost:8000/api/v1/
```

### Autenticação

Todos os endpoints (exceto login) requerem autenticação JWT.

#### Obter Token JWT

```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "seu_usuario",
  "password": "sua_senha"
}
```

**Resposta:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

Use o `access` token no header:
```
Authorization: Bearer <seu_access_token>
```

---

## 👥 Endpoints de Usuários

### Listar Usuários
```http
GET /usuarios/
```

### Obter Dados do Usuário Autenticado
```http
GET /usuarios/me/
```

### Atualizar Perfil
```http
PATCH /usuarios/update_profile/
Content-Type: application/json

{
  "first_name": "João",
  "last_name": "Silva",
  "posicao": "ATACANTE",
  "telefone": "11999999999"
}
```

---

## 🏟️ Endpoints de Rachas

### Criar Racha
```http
POST /rachas/
Content-Type: application/json

{
  "nome": "Racha da Quinta",
  "data_inicio": "2025-01-15",
  "ponto_gol": 2,
  "ponto_assistencia": 1,
  "ponto_presenca": 1
}
```

### Listar Meus Rachas
```http
GET /rachas/meus_rachas/
```

### Obter Detalhes do Racha
```http
GET /rachas/{id}/
```

### Atualizar Racha
```http
PATCH /rachas/{id}/
Content-Type: application/json

{
  "nome": "Novo Nome",
  "ponto_gol": 3
}
```

### Entrar em Racha por Código
```http
POST /rachas/{id}/entrar_por_codigo/
Content-Type: application/json

{
  "codigo_convite": "ABC12"
}
```

### Listar Jogadores do Racha
```http
GET /rachas/{id}/jogadores/
```

### Remover Jogador do Racha
```http
DELETE /rachas/{id}/remover_jogador/
Content-Type: application/json

{
  "jogador_id": "uuid-do-jogador"
}
```

---

## 📊 Endpoints de Ranking

### Ranking Geral
```http
GET /rachas/{id}/ranking/
```

**Resposta:**
```json
[
  {
    "jogador_id": "uuid",
    "jogador_nome": "João Silva",
    "posicao": "ATACANTE",
    "gols": 5,
    "assistencias": 3,
    "presencas": 10,
    "premios_pontos": 10,
    "pontuacao_total": 28
  }
]
```

### Ranking de Artilharia
```http
GET /rachas/{id}/ranking_artilheiros/
```

### Ranking de Assistências
```http
GET /rachas/{id}/ranking_assistencias/
```

---

## 🏅 Endpoints de Prêmios

### Criar Prêmio
```http
POST /premios/
Content-Type: application/json

{
  "racha": "uuid-do-racha",
  "nome": "Melhor Jogador",
  "valor_pontos": 5,
  "ativo": true
}
```

### Listar Prêmios
```http
GET /premios/
```

### Atualizar Prêmio
```http
PATCH /premios/{id}/
Content-Type: application/json

{
  "nome": "Novo Nome",
  "valor_pontos": 10
}
```

### Deletar Prêmio
```http
DELETE /premios/{id}/
```

---

## ⚽ Endpoints de Partidas

### Criar Partida
```http
POST /partidas/
Content-Type: application/json

{
  "racha": "uuid-do-racha"
}
```

### Listar Partidas
```http
GET /partidas/
```

### Obter Detalhes da Partida
```http
GET /partidas/{id}/
```

### Registrar Presença
```http
POST /partidas/{id}/registrar_presenca/
Content-Type: application/json

{
  "jogador_id": "uuid-do-jogador",
  "presente": true
}
```

### Registrar Gol
```http
POST /partidas/{id}/registrar_gol/
Content-Type: application/json

{
  "jogador_gol_id": "uuid-do-jogador",
  "jogador_assistencia_id": "uuid-do-assistente"  // opcional
}
```

### Registrar Prêmio
```http
POST /partidas/{id}/registrar_premio/
Content-Type: application/json

{
  "premio_id": "uuid-do-premio",
  "jogador_id": "uuid-do-jogador"
}
```

### Finalizar Partida
```http
POST /partidas/{id}/finalizar/
```

---

## 📝 Endpoints de Solicitações

### Listar Solicitações (Admin)
```http
GET /solicitacoes/
```

### Aprovar Solicitação
```http
POST /solicitacoes/{id}/aprovar/
```

### Negar Solicitação
```http
POST /solicitacoes/{id}/negar/
```

---

## 🗂️ Estrutura do Projeto

```
rachas_api/
├── config/                 # Configurações do Django
│   ├── settings.py        # Configurações principais
│   ├── urls.py            # URLs do projeto
│   └── wsgi.py
├── rachas/                # Aplicação principal
│   ├── models.py          # Modelos de dados
│   ├── serializers.py     # Serializers DRF
│   ├── views.py           # ViewSets e lógica
│   ├── permissions.py     # Permissões customizadas
│   ├── urls.py            # URLs da app
│   ├── tests.py           # Testes unitários
│   └── migrations/        # Migrações do banco
├── manage.py
├── requirements.txt       # Dependências
└── README.md
```

---

## 📊 Modelo de Dados

### User (Jogador)
- `id` (UUID)
- `username`, `email`, `password`
- `first_name`, `last_name`
- `telefone` (opcional)
- `data_nascimento`
- `posicao` (GOLEIRO, DEFENSOR, MEIA, ATACANTE)
- `imagem_perfil` (opcional)
- `auth_uid` (Google/Facebook ID)
- `data_criacao`

### Racha
- `id` (UUID)
- `administrador` (FK User)
- `nome`
- `imagem_perfil` (opcional)
- `data_inicio`, `data_encerramento`
- `codigo_convite` (5 caracteres, único)
- `ponto_gol`, `ponto_assistencia`, `ponto_presenca`
- `criado_em`

### JogadoresRacha
- `id` (UUID)
- `racha` (FK)
- `jogador` (FK)
- `data_entrada`
- `ativo`

### Partida
- `id` (UUID)
- `racha` (FK)
- `data_inicio`, `data_fim`
- `criado_em`

### RegistroPartida
- `id` (UUID)
- `partida` (FK)
- `jogador_gol` (FK)
- `jogador_assistencia` (FK, opcional)
- `criado_em`

### Premio
- `id` (UUID)
- `racha` (FK)
- `nome`
- `valor_pontos`
- `ativo`
- `criado_em`

### PremioPartida
- `id` (UUID)
- `partida` (FK)
- `premio` (FK)
- `jogador` (FK)
- `criado_em`

### SolicitacaoRacha
- `id` (UUID)
- `racha` (FK)
- `jogador` (FK)
- `status` (PENDENTE, ACEITO, NEGADO)
- `criado_em`

---

## 🔐 Permissões

| Ação | Quem Pode |
|------|-----------|
| Criar Racha | Qualquer usuário autenticado |
| Editar Racha | Admin do racha |
| Deletar Racha | Admin do racha |
| Criar Prêmio | Admin do racha |
| Criar Partida | Admin do racha |
| Aprovar Solicitação | Admin do racha |
| Registrar Gol/Presença | Admin do racha |
| Visualizar Ranking | Qualquer jogador do racha |

---

## 🧪 Executar Testes

```bash
python manage.py test rachas.tests -v 2
```

---

## 📝 Fórmula de Pontuação

```
pontuacao_total = 
  (gols × ponto_gol) +
  (assistencias × ponto_assistencia) +
  (presencas × ponto_presenca) +
  soma(premios_valor_pontos)
```

---

## 🔧 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DEBUG=True
SECRET_KEY=sua-chave-secreta
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=seu-client-id
GOOGLE_OAUTH_CLIENT_SECRET=seu-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=seu-app-id
FACEBOOK_APP_SECRET=seu-app-secret
```

---

## 🚀 Deploy em Produção

### Com Gunicorn + Nginx

```bash
pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### Com Docker

```dockerfile
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

## 📄 Licença

Este projeto está licenciado sob a MIT License.

---

## 👨‍💻 Desenvolvido com ❤️

API desenvolvida com Django REST Framework para gerenciar rachas de futebol de forma simples e eficiente.
