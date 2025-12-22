# 🚀 Guia Rápido - API de Rachas

## Iniciar Servidor

```bash
cd rachas_api
source venv/bin/activate
python manage.py runserver
```

Acesse: `http://localhost:8000/`

---

## 1️⃣ Autenticação

### Criar Usuário

```bash
curl -X POST http://localhost:8000/api/v1/usuarios/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "joao",
    "email": "joao@example.com",
    "password": "senha123",
    "first_name": "João",
    "last_name": "Silva",
    "data_nascimento": "1990-05-15",
    "posicao": "ATACANTE",
    "auth_uid": "google-123456"
  }'
```

### Fazer Login

```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "joao",
    "password": "senha123"
  }'
```

**Resposta:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

## 2️⃣ Criar um Racha

```bash
TOKEN="seu_access_token_aqui"

curl -X POST http://localhost:8000/api/v1/rachas/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Racha da Quinta",
    "ponto_gol": 2,
    "ponto_assistencia": 1,
    "ponto_presenca": 1
  }'
```

**Resposta:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nome": "Racha da Quinta",
  "codigo_convite": "ABC12",
  "administrador": {
    "id": "...",
    "username": "joao"
  },
  "ponto_gol": 2,
  "ponto_assistencia": 1,
  "ponto_presenca": 1,
  "total_jogadores": 1,
  "criado_em": "2025-01-15T10:30:00Z"
}
```

---

## 3️⃣ Adicionar Jogadores

### Método 1: Usar Código de Convite

Outro usuário pode entrar usando o código:

```bash
curl -X POST http://localhost:8000/api/v1/rachas/550e8400-e29b-41d4-a716-446655440000/entrar_por_codigo/ \
  -H "Authorization: Bearer $TOKEN_OUTRO_USUARIO" \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_convite": "ABC12"
  }'
```

### Método 2: Admin Aprova Solicitação

```bash
# Listar solicitações pendentes
curl -X GET http://localhost:8000/api/v1/solicitacoes/ \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# Aprovar solicitação
curl -X POST http://localhost:8000/api/v1/solicitacoes/solicitacao-id/aprovar/ \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

---

## 4️⃣ Criar Prêmios

```bash
curl -X POST http://localhost:8000/api/v1/premios/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "racha": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "Melhor Jogador",
    "valor_pontos": 5,
    "ativo": true
  }'
```

---

## 5️⃣ Criar e Gerenciar Partida

### Criar Partida

```bash
curl -X POST http://localhost:8000/api/v1/partidas/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "racha": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Registrar Presença

```bash
curl -X POST http://localhost:8000/api/v1/partidas/partida-id/registrar_presenca/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "jogador_id": "jogador-uuid",
    "presente": true
  }'
```

### Registrar Gol

```bash
curl -X POST http://localhost:8000/api/v1/partidas/partida-id/registrar_gol/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "jogador_gol_id": "jogador-uuid",
    "jogador_assistencia_id": "outro-jogador-uuid"
  }'
```

### Registrar Prêmio

```bash
curl -X POST http://localhost:8000/api/v1/partidas/partida-id/registrar_premio/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "premio_id": "premio-uuid",
    "jogador_id": "jogador-uuid"
  }'
```

### Finalizar Partida

```bash
curl -X POST http://localhost:8000/api/v1/partidas/partida-id/finalizar/ \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

---

## 6️⃣ Visualizar Ranking

### Ranking Geral

```bash
curl -X GET http://localhost:8000/api/v1/rachas/racha-id/ranking/ \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta:**
```json
[
  {
    "jogador_id": "...",
    "jogador_nome": "João Silva",
    "posicao": "ATACANTE",
    "gols": 5,
    "assistencias": 2,
    "presencas": 10,
    "premios_pontos": 5,
    "pontuacao_total": 28
  },
  {
    "jogador_id": "...",
    "jogador_nome": "Pedro Santos",
    "posicao": "GOLEIRO",
    "gols": 0,
    "assistencias": 0,
    "presencas": 10,
    "premios_pontos": 0,
    "pontuacao_total": 10
  }
]
```

### Ranking de Artilharia

```bash
curl -X GET http://localhost:8000/api/v1/rachas/racha-id/ranking_artilheiros/ \
  -H "Authorization: Bearer $TOKEN"
```

### Ranking de Assistências

```bash
curl -X GET http://localhost:8000/api/v1/rachas/racha-id/ranking_assistencias/ \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Exemplo Completo com Python

```python
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# 1. Fazer login
login_response = requests.post(
    f"{BASE_URL}/../auth/token/",
    json={"username": "joao", "password": "senha123"}
)
token = login_response.json()["access"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Criar racha
racha_response = requests.post(
    f"{BASE_URL}/rachas/",
    headers=headers,
    json={
        "nome": "Racha da Quinta",
        "ponto_gol": 2,
        "ponto_assistencia": 1,
        "ponto_presenca": 1
    }
)
racha_id = racha_response.json()["id"]
print(f"Racha criado: {racha_id}")

# 3. Criar prêmio
premio_response = requests.post(
    f"{BASE_URL}/premios/",
    headers=headers,
    json={
        "racha": racha_id,
        "nome": "Melhor Jogador",
        "valor_pontos": 5,
        "ativo": True
    }
)
print(f"Prêmio criado: {premio_response.json()}")

# 4. Criar partida
partida_response = requests.post(
    f"{BASE_URL}/partidas/",
    headers=headers,
    json={"racha": racha_id}
)
partida_id = partida_response.json()["id"]
print(f"Partida criada: {partida_id}")

# 5. Ver ranking
ranking_response = requests.get(
    f"{BASE_URL}/rachas/{racha_id}/ranking/",
    headers=headers
)
print("Ranking:", json.dumps(ranking_response.json(), indent=2))
```

---

## 🔗 Links Úteis

- **Documentação Completa**: [README.md](README.md)
- **Admin Django**: `http://localhost:8000/admin/`
- **API Root**: `http://localhost:8000/api/v1/`

---

## 💡 Dicas

1. **Salve o token** em uma variável de ambiente para facilitar testes
2. **Use Postman** ou **Insomnia** para testar endpoints
3. **Verifique logs** com `python manage.py runserver --verbosity 2`
4. **Teste com SQLite** primeiro, depois migre para PostgreSQL

---

## ❓ Troubleshooting

### Erro: "Token is invalid or expired"
- Faça login novamente e obtenha um novo token

### Erro: "User is not admin of this racha"
- Certifique-se de estar autenticado como o admin do racha

### Erro: "Racha not found"
- Verifique se o ID do racha está correto

---

Divirta-se gerenciando seus rachas! ⚽🎉
