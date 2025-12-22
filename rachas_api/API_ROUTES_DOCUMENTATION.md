# 📋 Documentação Técnica Completa - API de Rachas

## Índice
1. [Autenticação](#autenticação)
2. [Usuários](#usuários)
3. [Rachas](#rachas)
4. [Prêmios](#prêmios)
5. [Partidas](#partidas)
6. [Solicitações](#solicitações)
7. [Modelos de Resposta](#modelos-de-resposta)

---

## 🔐 Autenticação

### 1. Obter Token JWT

**Endpoint:** `POST /api/auth/token/`

**Descrição:** Autentica o usuário e retorna tokens de acesso e refresh.

**Headers:**
```
Content-Type: application/json
```

**Payload (Request):**
```json
{
  "username": "string (obrigatório)",
  "password": "string (obrigatório)"
}
```

**Exemplo de Request:**
```json
{
  "username": "joao",
  "password": "senha123"
}
```

**Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Códigos de Erro:**
- `400 Bad Request` - Credenciais inválidas
- `401 Unauthorized` - Usuário ou senha incorretos

**Uso do Token:**
```
Authorization: Bearer {access_token}
```

---

### 2. Renovar Token

**Endpoint:** `POST /api/auth/token/refresh/`

**Descrição:** Renova o token de acesso usando o refresh token.

**Headers:**
```
Content-Type: application/json
```

**Payload (Request):**
```json
{
  "refresh": "string (obrigatório)"
}
```

**Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

## 👥 Usuários

### 1. Listar Usuários

**Endpoint:** `GET /api/v1/usuarios/`

**Descrição:** Lista todos os usuários com paginação e busca.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `page` | integer | Número da página (padrão: 1) | `?page=2` |
| `search` | string | Buscar por username, email, nome | `?search=joao` |
| `ordering` | string | Ordenar por campo | `?ordering=-data_criacao` |

**Response (200 OK):**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/v1/usuarios/?page=2",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "joao",
      "email": "joao@example.com",
      "first_name": "João",
      "last_name": "Silva",
      "telefone": "11999999999",
      "data_nascimento": "1990-05-15",
      "posicao": "ATACANTE",
      "imagem_perfil": "https://...",
      "data_criacao": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Códigos de Erro:**
- `401 Unauthorized` - Token inválido ou ausente

---

### 2. Obter Dados do Usuário Autenticado

**Endpoint:** `GET /api/v1/usuarios/me/`

**Descrição:** Retorna os dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Query Parameters:** Nenhum

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "joao",
  "email": "joao@example.com",
  "first_name": "João",
  "last_name": "Silva",
  "telefone": "11999999999",
  "data_nascimento": "1990-05-15",
  "posicao": "ATACANTE",
  "imagem_perfil": "https://...",
  "auth_uid": "google-123456",
  "data_criacao": "2025-01-15T10:30:00Z"
}
```

---

### 3. Atualizar Perfil do Usuário

**Endpoint:** `PATCH /api/v1/usuarios/update_profile/`

**Descrição:** Atualiza o perfil do usuário autenticado (campos parciais).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Payload (Request) - Todos os campos são opcionais:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "telefone": "string",
  "posicao": "string (GOLEIRO|DEFENSOR|MEIA|ATACANTE)",
  "imagem_perfil": "file (multipart/form-data)"
}
```

**Exemplo de Request:**
```json
{
  "first_name": "João",
  "last_name": "Silva",
  "posicao": "ATACANTE",
  "telefone": "11999999999"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "joao",
  "email": "joao@example.com",
  "first_name": "João",
  "last_name": "Silva",
  "telefone": "11999999999",
  "data_nascimento": "1990-05-15",
  "posicao": "ATACANTE",
  "imagem_perfil": "https://...",
  "data_criacao": "2025-01-15T10:30:00Z"
}
```

**Códigos de Erro:**
- `400 Bad Request` - Dados inválidos
- `401 Unauthorized` - Token inválido

---

## 🏟️ Rachas

### 1. Criar Racha

**Endpoint:** `POST /api/v1/rachas/`

**Descrição:** Cria um novo racha. O usuário autenticado se torna automaticamente o administrador.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Payload (Request):**
```json
{
  "nome": "string (obrigatório, máx 255 caracteres)",
  "imagem_perfil": "file (opcional)",
  "data_inicio": "date (opcional, formato: YYYY-MM-DD)",
  "data_encerramento": "date (opcional, formato: YYYY-MM-DD)",
  "ponto_gol": "integer (obrigatório, mín: 0)",
  "ponto_assistencia": "integer (obrigatório, mín: 0)",
  "ponto_presenca": "integer (obrigatório, mín: 0)"
}
```

**Exemplo de Request:**
```json
{
  "nome": "Racha da Quinta",
  "data_inicio": "2025-01-20",
  "ponto_gol": 2,
  "ponto_assistencia": 1,
  "ponto_presenca": 1
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "administrador": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "username": "joao",
    "email": "joao@example.com",
    "first_name": "João",
    "last_name": "Silva",
    "telefone": "11999999999",
    "data_nascimento": "1990-05-15",
    "posicao": "ATACANTE",
    "imagem_perfil": "https://...",
    "data_criacao": "2025-01-15T10:30:00Z"
  },
  "nome": "Racha da Quinta",
  "imagem_perfil": null,
  "data_inicio": "2025-01-20",
  "data_encerramento": null,
  "codigo_convite": "ABC12",
  "ponto_gol": 2,
  "ponto_assistencia": 1,
  "ponto_presenca": 1,
  "criado_em": "2025-01-15T10:30:00Z",
  "total_jogadores": 1
}
```

**Códigos de Erro:**
- `400 Bad Request` - Dados inválidos
- `401 Unauthorized` - Token inválido

---

### 2. Listar Rachas

**Endpoint:** `GET /api/v1/rachas/`

**Descrição:** Lista todos os rachas com paginação e filtros.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `page` | integer | Número da página | `?page=1` |
| `search` | string | Buscar por nome ou código | `?search=quinta` |
| `ordering` | string | Ordenar por campo | `?ordering=-criado_em` |

**Response (200 OK):**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "administrador": {...},
      "nome": "Racha da Quinta",
      "imagem_perfil": null,
      "data_inicio": "2025-01-20",
      "data_encerramento": null,
      "codigo_convite": "ABC12",
      "ponto_gol": 2,
      "ponto_assistencia": 1,
      "ponto_presenca": 1,
      "criado_em": "2025-01-15T10:30:00Z",
      "total_jogadores": 5
    }
  ]
}
```

---

### 3. Obter Detalhes do Racha

**Endpoint:** `GET /api/v1/rachas/{id}/`

**Descrição:** Retorna os detalhes completos de um racha incluindo prêmios.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "administrador": {...},
  "nome": "Racha da Quinta",
  "imagem_perfil": null,
  "data_inicio": "2025-01-20",
  "data_encerramento": null,
  "codigo_convite": "ABC12",
  "ponto_gol": 2,
  "ponto_assistencia": 1,
  "ponto_presenca": 1,
  "criado_em": "2025-01-15T10:30:00Z",
  "total_jogadores": 5,
  "premios": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "racha": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "Melhor Jogador",
      "valor_pontos": 5,
      "ativo": true,
      "criado_em": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Códigos de Erro:**
- `404 Not Found` - Racha não encontrado
- `401 Unauthorized` - Token inválido

---

### 4. Atualizar Racha

**Endpoint:** `PATCH /api/v1/rachas/{id}/`

**Descrição:** Atualiza um racha (apenas o admin pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Payload (Request) - Todos os campos são opcionais:**
```json
{
  "nome": "string",
  "imagem_perfil": "file",
  "data_inicio": "date (YYYY-MM-DD)",
  "data_encerramento": "date (YYYY-MM-DD)",
  "ponto_gol": "integer",
  "ponto_assistencia": "integer",
  "ponto_presenca": "integer"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "administrador": {...},
  "nome": "Racha da Quinta - Atualizado",
  "imagem_perfil": null,
  "data_inicio": "2025-01-20",
  "data_encerramento": null,
  "codigo_convite": "ABC12",
  "ponto_gol": 3,
  "ponto_assistencia": 1,
  "ponto_presenca": 1,
  "criado_em": "2025-01-15T10:30:00Z",
  "total_jogadores": 5
}
```

**Códigos de Erro:**
- `403 Forbidden` - Não é admin do racha
- `404 Not Found` - Racha não encontrado
- `400 Bad Request` - Dados inválidos

---

### 5. Deletar Racha

**Endpoint:** `DELETE /api/v1/rachas/{id}/`

**Descrição:** Deleta um racha (apenas o admin pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Response (204 No Content):** Sem corpo

**Códigos de Erro:**
- `403 Forbidden` - Não é admin do racha
- `404 Not Found` - Racha não encontrado

---

### 6. Listar Meus Rachas

**Endpoint:** `GET /api/v1/rachas/meus_rachas/`

**Descrição:** Lista apenas os rachas do usuário autenticado (como admin ou jogador).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `page` | integer | Número da página | `?page=1` |
| `search` | string | Buscar por nome | `?search=quinta` |

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "administrador": {...},
    "nome": "Racha da Quinta",
    "imagem_perfil": null,
    "data_inicio": "2025-01-20",
    "data_encerramento": null,
    "codigo_convite": "ABC12",
    "ponto_gol": 2,
    "ponto_assistencia": 1,
    "ponto_presenca": 1,
    "criado_em": "2025-01-15T10:30:00Z",
    "total_jogadores": 5
  }
]
```

---

### 7. Entrar em Racha por Código

**Endpoint:** `POST /api/v1/rachas/{id}/entrar_por_codigo/`

**Descrição:** Cria uma solicitação de entrada em um racha usando o código de convite.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Payload (Request):**
```json
{
  "codigo_convite": "string (obrigatório, 5 caracteres)"
}
```

**Exemplo de Request:**
```json
{
  "codigo_convite": "ABC12"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "racha": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "administrador": {...},
    "nome": "Racha da Quinta",
    "imagem_perfil": null,
    "data_inicio": "2025-01-20",
    "data_encerramento": null,
    "codigo_convite": "ABC12",
    "ponto_gol": 2,
    "ponto_assistencia": 1,
    "ponto_presenca": 1,
    "criado_em": "2025-01-15T10:30:00Z",
    "total_jogadores": 5
  },
  "jogador": {...},
  "status": "PENDENTE",
  "criado_em": "2025-01-15T10:30:00Z"
}
```

**Códigos de Erro:**
- `400 Bad Request` - Código inválido ou já é membro
- `404 Not Found` - Racha não encontrado

---

### 8. Listar Jogadores do Racha

**Endpoint:** `GET /api/v1/rachas/{id}/jogadores/`

**Descrição:** Lista todos os jogadores ativos de um racha.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "racha": "550e8400-e29b-41d4-a716-446655440000",
    "jogador": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "username": "joao",
      "email": "joao@example.com",
      "first_name": "João",
      "last_name": "Silva",
      "telefone": "11999999999",
      "data_nascimento": "1990-05-15",
      "posicao": "ATACANTE",
      "imagem_perfil": "https://...",
      "data_criacao": "2025-01-15T10:30:00Z"
    },
    "data_entrada": "2025-01-15T10:30:00Z",
    "ativo": true
  }
]
```

---

### 9. Remover Jogador do Racha

**Endpoint:** `DELETE /api/v1/rachas/{id}/remover_jogador/`

**Descrição:** Remove um jogador do racha (apenas admin pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Payload (Request):**
```json
{
  "jogador_id": "UUID (obrigatório)"
}
```

**Response (200 OK):**
```json
{
  "mensagem": "Jogador removido com sucesso"
}
```

**Códigos de Erro:**
- `403 Forbidden` - Não é admin
- `404 Not Found` - Jogador ou racha não encontrado

---

### 10. Ranking Geral do Racha

**Endpoint:** `GET /api/v1/rachas/{id}/ranking/`

**Descrição:** Retorna o ranking geral dos jogadores do racha com pontuação total.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Response (200 OK):**
```json
[
  {
    "jogador_id": "550e8400-e29b-41d4-a716-446655440001",
    "jogador_nome": "João Silva",
    "posicao": "ATACANTE",
    "gols": 5,
    "assistencias": 2,
    "presencas": 10,
    "premios_pontos": 5,
    "pontuacao_total": 28
  },
  {
    "jogador_id": "550e8400-e29b-41d4-a716-446655440005",
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

**Fórmula de Cálculo:**
```
pontuacao_total = 
  (gols × ponto_gol) +
  (assistencias × ponto_assistencia) +
  (presencas × ponto_presenca) +
  soma(premios_valor_pontos)
```

---

### 11. Ranking de Artilharia

**Endpoint:** `GET /api/v1/rachas/{id}/ranking_artilheiros/`

**Descrição:** Retorna o ranking de artilharia (mais gols) do racha.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Response (200 OK):**
```json
[
  {
    "jogador_id": "550e8400-e29b-41d4-a716-446655440001",
    "jogador_nome": "João Silva",
    "gols": 5,
    "posicao": 1
  },
  {
    "jogador_id": "550e8400-e29b-41d4-a716-446655440006",
    "jogador_nome": "Carlos Oliveira",
    "gols": 3,
    "posicao": 2
  }
]
```

---

### 12. Ranking de Assistências

**Endpoint:** `GET /api/v1/rachas/{id}/ranking_assistencias/`

**Descrição:** Retorna o ranking de assistências do racha.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do racha |

**Response (200 OK):**
```json
[
  {
    "jogador_id": "550e8400-e29b-41d4-a716-446655440001",
    "jogador_nome": "João Silva",
    "assistencias": 2,
    "posicao": 1
  },
  {
    "jogador_id": "550e8400-e29b-41d4-a716-446655440007",
    "jogador_nome": "Lucas Ferreira",
    "assistencias": 1,
    "posicao": 2
  }
]
```

---

## 🏅 Prêmios

### 1. Criar Prêmio

**Endpoint:** `POST /api/v1/premios/`

**Descrição:** Cria um novo prêmio para um racha (apenas admin do racha pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Payload (Request):**
```json
{
  "racha": "UUID (obrigatório)",
  "nome": "string (obrigatório, máx 255 caracteres)",
  "valor_pontos": "integer (obrigatório, mín: 0)",
  "ativo": "boolean (padrão: true)"
}
```

**Exemplo de Request:**
```json
{
  "racha": "550e8400-e29b-41d4-a716-446655440000",
  "nome": "Melhor Jogador",
  "valor_pontos": 5,
  "ativo": true
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440008",
  "racha": "550e8400-e29b-41d4-a716-446655440000",
  "nome": "Melhor Jogador",
  "valor_pontos": 5,
  "ativo": true,
  "criado_em": "2025-01-15T10:30:00Z"
}
```

**Códigos de Erro:**
- `400 Bad Request` - Dados inválidos
- `403 Forbidden` - Não é admin do racha
- `404 Not Found` - Racha não encontrado

---

### 2. Listar Prêmios

**Endpoint:** `GET /api/v1/premios/`

**Descrição:** Lista todos os prêmios dos rachas do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `page` | integer | Número da página | `?page=1` |
| `search` | string | Buscar por nome | `?search=melhor` |

**Response (200 OK):**
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "racha": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "Melhor Jogador",
      "valor_pontos": 5,
      "ativo": true,
      "criado_em": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 3. Atualizar Prêmio

**Endpoint:** `PATCH /api/v1/premios/{id}/`

**Descrição:** Atualiza um prêmio (apenas admin do racha pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do prêmio |

**Payload (Request) - Todos os campos são opcionais:**
```json
{
  "nome": "string",
  "valor_pontos": "integer",
  "ativo": "boolean"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440008",
  "racha": "550e8400-e29b-41d4-a716-446655440000",
  "nome": "Melhor Jogador - Atualizado",
  "valor_pontos": 10,
  "ativo": true,
  "criado_em": "2025-01-15T10:30:00Z"
}
```

---

### 4. Deletar Prêmio

**Endpoint:** `DELETE /api/v1/premios/{id}/`

**Descrição:** Deleta um prêmio (apenas admin do racha pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do prêmio |

**Response (204 No Content):** Sem corpo

---

## ⚽ Partidas

### 1. Criar Partida

**Endpoint:** `POST /api/v1/partidas/`

**Descrição:** Cria uma nova partida (apenas admin do racha pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Payload (Request):**
```json
{
  "racha": "UUID (obrigatório)"
}
```

**Exemplo de Request:**
```json
{
  "racha": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440009",
  "racha": "550e8400-e29b-41d4-a716-446655440000",
  "data_inicio": null,
  "data_fim": null,
  "criado_em": "2025-01-15T10:30:00Z"
}
```

**Códigos de Erro:**
- `403 Forbidden` - Não é admin do racha
- `404 Not Found` - Racha não encontrado

---

### 2. Listar Partidas

**Endpoint:** `GET /api/v1/partidas/`

**Descrição:** Lista todas as partidas dos rachas do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `page` | integer | Número da página | `?page=1` |
| `ordering` | string | Ordenar por campo | `?ordering=-criado_em` |

**Response (200 OK):**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440009",
      "racha": "550e8400-e29b-41d4-a716-446655440000",
      "data_inicio": null,
      "data_fim": null,
      "criado_em": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 3. Obter Detalhes da Partida

**Endpoint:** `GET /api/v1/partidas/{id}/`

**Descrição:** Retorna os detalhes completos de uma partida incluindo presença, gols e prêmios.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da partida |

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440009",
  "racha": "550e8400-e29b-41d4-a716-446655440000",
  "data_inicio": null,
  "data_fim": null,
  "criado_em": "2025-01-15T10:30:00Z",
  "jogadores_presenca": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "partida": "550e8400-e29b-41d4-a716-446655440009",
      "jogador": {...},
      "presente": true
    }
  ],
  "registros": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "partida": "550e8400-e29b-41d4-a716-446655440009",
      "jogador_gol": {...},
      "jogador_assistencia": {...},
      "criado_em": "2025-01-15T10:30:00Z"
    }
  ],
  "premios_partida": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "partida": "550e8400-e29b-41d4-a716-446655440009",
      "premio": {...},
      "jogador": {...},
      "criado_em": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 4. Atualizar Partida

**Endpoint:** `PATCH /api/v1/partidas/{id}/`

**Descrição:** Atualiza uma partida (apenas admin do racha pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da partida |

**Payload (Request) - Todos os campos são opcionais:**
```json
{
  "data_inicio": "datetime (ISO 8601)",
  "data_fim": "datetime (ISO 8601)"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440009",
  "racha": "550e8400-e29b-41d4-a716-446655440000",
  "data_inicio": "2025-01-15T10:30:00Z",
  "data_fim": null,
  "criado_em": "2025-01-15T10:30:00Z"
}
```

---

### 5. Registrar Presença

**Endpoint:** `POST /api/v1/partidas/{id}/registrar_presenca/`

**Descrição:** Registra a presença de um jogador na partida (apenas admin pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da partida |

**Payload (Request):**
```json
{
  "jogador_id": "UUID (obrigatório)",
  "presente": "boolean (padrão: true)"
}
```

**Exemplo de Request:**
```json
{
  "jogador_id": "550e8400-e29b-41d4-a716-446655440001",
  "presente": true
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "partida": "550e8400-e29b-41d4-a716-446655440009",
  "jogador": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "username": "joao",
    "email": "joao@example.com",
    "first_name": "João",
    "last_name": "Silva",
    "telefone": "11999999999",
    "data_nascimento": "1990-05-15",
    "posicao": "ATACANTE",
    "imagem_perfil": "https://...",
    "data_criacao": "2025-01-15T10:30:00Z"
  },
  "presente": true
}
```

**Códigos de Erro:**
- `400 Bad Request` - Dados inválidos
- `403 Forbidden` - Não é admin
- `404 Not Found` - Partida ou jogador não encontrado

---

### 6. Registrar Gol

**Endpoint:** `POST /api/v1/partidas/{id}/registrar_gol/`

**Descrição:** Registra um gol na partida (apenas admin pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da partida |

**Payload (Request):**
```json
{
  "jogador_gol_id": "UUID (obrigatório)",
  "jogador_assistencia_id": "UUID (opcional)"
}
```

**Exemplo de Request:**
```json
{
  "jogador_gol_id": "550e8400-e29b-41d4-a716-446655440001",
  "jogador_assistencia_id": "550e8400-e29b-41d4-a716-446655440005"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440011",
  "partida": "550e8400-e29b-41d4-a716-446655440009",
  "jogador_gol": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "username": "joao",
    "email": "joao@example.com",
    "first_name": "João",
    "last_name": "Silva",
    "telefone": "11999999999",
    "data_nascimento": "1990-05-15",
    "posicao": "ATACANTE",
    "imagem_perfil": "https://...",
    "data_criacao": "2025-01-15T10:30:00Z"
  },
  "jogador_assistencia": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "username": "pedro",
    "email": "pedro@example.com",
    "first_name": "Pedro",
    "last_name": "Santos",
    "telefone": "11988888888",
    "data_nascimento": "1992-03-20",
    "posicao": "MEIA",
    "imagem_perfil": "https://...",
    "data_criacao": "2025-01-15T10:30:00Z"
  },
  "criado_em": "2025-01-15T10:30:00Z"
}
```

**Códigos de Erro:**
- `400 Bad Request` - Dados inválidos
- `403 Forbidden` - Não é admin
- `404 Not Found` - Partida ou jogador não encontrado

---

### 7. Registrar Prêmio

**Endpoint:** `POST /api/v1/partidas/{id}/registrar_premio/`

**Descrição:** Registra um prêmio para um jogador na partida (apenas admin pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da partida |

**Payload (Request):**
```json
{
  "premio_id": "UUID (obrigatório)",
  "jogador_id": "UUID (obrigatório)"
}
```

**Exemplo de Request:**
```json
{
  "premio_id": "550e8400-e29b-41d4-a716-446655440008",
  "jogador_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440012",
  "partida": "550e8400-e29b-41d4-a716-446655440009",
  "premio": {
    "id": "550e8400-e29b-41d4-a716-446655440008",
    "racha": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "Melhor Jogador",
    "valor_pontos": 5,
    "ativo": true,
    "criado_em": "2025-01-15T10:30:00Z"
  },
  "jogador": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "username": "joao",
    "email": "joao@example.com",
    "first_name": "João",
    "last_name": "Silva",
    "telefone": "11999999999",
    "data_nascimento": "1990-05-15",
    "posicao": "ATACANTE",
    "imagem_perfil": "https://...",
    "data_criacao": "2025-01-15T10:30:00Z"
  },
  "criado_em": "2025-01-15T10:30:00Z"
}
```

**Códigos de Erro:**
- `400 Bad Request` - Dados inválidos
- `403 Forbidden` - Não é admin
- `404 Not Found` - Partida, prêmio ou jogador não encontrado

---

### 8. Finalizar Partida

**Endpoint:** `POST /api/v1/partidas/{id}/finalizar/`

**Descrição:** Finaliza uma partida (apenas admin do racha pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da partida |

**Payload (Request):** Sem corpo

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440009",
  "racha": "550e8400-e29b-41d4-a716-446655440000",
  "data_inicio": "2025-01-15T10:30:00Z",
  "data_fim": "2025-01-15T12:30:00Z",
  "criado_em": "2025-01-15T10:30:00Z",
  "jogadores_presenca": [...],
  "registros": [...],
  "premios_partida": [...]
}
```

**Códigos de Erro:**
- `403 Forbidden` - Não é admin
- `404 Not Found` - Partida não encontrado

---

## 📝 Solicitações

### 1. Listar Solicitações

**Endpoint:** `GET /api/v1/solicitacoes/`

**Descrição:** Lista as solicitações de entrada em rachas (apenas para admins dos rachas).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `page` | integer | Número da página | `?page=1` |
| `ordering` | string | Ordenar por campo | `?ordering=-criado_em` |

**Response (200 OK):**
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440013",
      "racha": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "administrador": {...},
        "nome": "Racha da Quinta",
        "imagem_perfil": null,
        "data_inicio": "2025-01-20",
        "data_encerramento": null,
        "codigo_convite": "ABC12",
        "ponto_gol": 2,
        "ponto_assistencia": 1,
        "ponto_presenca": 1,
        "criado_em": "2025-01-15T10:30:00Z",
        "total_jogadores": 5
      },
      "jogador": {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "username": "carlos",
        "email": "carlos@example.com",
        "first_name": "Carlos",
        "last_name": "Oliveira",
        "telefone": "11987654321",
        "data_nascimento": "1988-07-10",
        "posicao": "DEFENSOR",
        "imagem_perfil": "https://...",
        "data_criacao": "2025-01-15T10:30:00Z"
      },
      "status": "PENDENTE",
      "criado_em": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 2. Aprovar Solicitação

**Endpoint:** `POST /api/v1/solicitacoes/{id}/aprovar/`

**Descrição:** Aprova uma solicitação de entrada (apenas admin do racha pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da solicitação |

**Payload (Request):** Sem corpo

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440013",
  "racha": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "administrador": {...},
    "nome": "Racha da Quinta",
    "imagem_perfil": null,
    "data_inicio": "2025-01-20",
    "data_encerramento": null,
    "codigo_convite": "ABC12",
    "ponto_gol": 2,
    "ponto_assistencia": 1,
    "ponto_presenca": 1,
    "criado_em": "2025-01-15T10:30:00Z",
    "total_jogadores": 6
  },
  "jogador": {...},
  "status": "ACEITO",
  "criado_em": "2025-01-15T10:30:00Z"
}
```

**Códigos de Erro:**
- `403 Forbidden` - Não é admin do racha
- `404 Not Found` - Solicitação não encontrado

---

### 3. Negar Solicitação

**Endpoint:** `POST /api/v1/solicitacoes/{id}/negar/`

**Descrição:** Nega uma solicitação de entrada (apenas admin do racha pode fazer isso).

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da solicitação |

**Payload (Request):** Sem corpo

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440013",
  "racha": {...},
  "jogador": {...},
  "status": "NEGADO",
  "criado_em": "2025-01-15T10:30:00Z"
}
```

**Códigos de Erro:**
- `403 Forbidden` - Não é admin do racha
- `404 Not Found` - Solicitação não encontrado

---

## 📦 Modelos de Resposta

### User
```json
{
  "id": "UUID",
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "telefone": "string",
  "data_nascimento": "date (YYYY-MM-DD)",
  "posicao": "string (GOLEIRO|DEFENSOR|MEIA|ATACANTE)",
  "imagem_perfil": "url",
  "auth_uid": "string",
  "data_criacao": "datetime (ISO 8601)"
}
```

### Racha
```json
{
  "id": "UUID",
  "administrador": "User",
  "nome": "string",
  "imagem_perfil": "url",
  "data_inicio": "date",
  "data_encerramento": "date",
  "codigo_convite": "string (5 chars)",
  "ponto_gol": "integer",
  "ponto_assistencia": "integer",
  "ponto_presenca": "integer",
  "criado_em": "datetime",
  "total_jogadores": "integer",
  "premios": "Premio[]"
}
```

### Partida
```json
{
  "id": "UUID",
  "racha": "UUID",
  "data_inicio": "datetime",
  "data_fim": "datetime",
  "criado_em": "datetime",
  "jogadores_presenca": "JogadorPartida[]",
  "registros": "RegistroPartida[]",
  "premios_partida": "PremioPartida[]"
}
```

### Premio
```json
{
  "id": "UUID",
  "racha": "UUID",
  "nome": "string",
  "valor_pontos": "integer",
  "ativo": "boolean",
  "criado_em": "datetime"
}
```

### SolicitacaoRacha
```json
{
  "id": "UUID",
  "racha": "Racha",
  "jogador": "User",
  "status": "string (PENDENTE|ACEITO|NEGADO)",
  "criado_em": "datetime"
}
```

---

## 🔄 Fluxos Principais

### Fluxo 1: Criar e Gerenciar um Racha

1. **POST /api/v1/rachas/** - Criar racha
2. **GET /api/v1/rachas/{id}/** - Obter detalhes
3. **POST /api/v1/premios/** - Criar prêmios
4. **GET /api/v1/rachas/{id}/jogadores/** - Listar jogadores
5. **POST /api/v1/partidas/** - Criar partida
6. **GET /api/v1/rachas/{id}/ranking/** - Ver ranking

### Fluxo 2: Jogador Entrar em um Racha

1. **POST /api/v1/rachas/{id}/entrar_por_codigo/** - Solicitar entrada
2. Admin aprova: **POST /api/v1/solicitacoes/{id}/aprovar/**
3. **GET /api/v1/rachas/meus_rachas/** - Ver rachas do jogador

### Fluxo 3: Registrar Partida

1. **POST /api/v1/partidas/** - Criar partida
2. **POST /api/v1/partidas/{id}/registrar_presenca/** - Registrar presença
3. **POST /api/v1/partidas/{id}/registrar_gol/** - Registrar gol
4. **POST /api/v1/partidas/{id}/registrar_premio/** - Registrar prêmio
5. **POST /api/v1/partidas/{id}/finalizar/** - Finalizar partida
6. **GET /api/v1/rachas/{id}/ranking/** - Ver novo ranking

---

## 📊 Códigos HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado com sucesso |
| 204 | No Content - Requisição bem-sucedida, sem corpo |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Autenticação necessária |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 500 | Internal Server Error - Erro no servidor |

---

## 🔐 Autenticação

Todos os endpoints (exceto `/api/auth/token/`) requerem o header:
```
Authorization: Bearer {access_token}
```

O token expira em **24 horas**. Use o refresh token para obter um novo access token.

---

## 📝 Notas Importantes

1. **UUIDs**: Todos os IDs são UUIDs (formato: `550e8400-e29b-41d4-a716-446655440000`)
2. **Datas**: Formato ISO 8601 (ex: `2025-01-15T10:30:00Z`)
3. **Paginação**: Padrão de 20 itens por página
4. **Permissões**: Apenas admins podem criar/editar/deletar rachas e partidas
5. **Código de Convite**: Gerado automaticamente (5 caracteres alfanuméricos)
6. **Ranking**: Atualizado em tempo real baseado em gols, assistências, presença e prêmios

---

Documento gerado para integração com UX/UI Design
