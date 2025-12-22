# 🖼️ Solução: URLs Completas de Imagens

## 🎯 Problema

Backend retornava caminhos relativos como `perfis/foto.jpg`, sem a URL base (`/media/` ou `http://localhost:8000/`), causando falhas ao carregar imagens no frontend.

## ✅ Solução Implementada

### 1️⃣ **Backend (Django)**

#### `rachas/models.py`

- ✅ Adicionado método `get_imagem_perfil_url()` no modelo `User` para gerar URLs completas

#### `rachas/serializers.py`

- ✅ Criada função helper `get_image_url()` que:
  - Verifica se a imagem é nula
  - Se URL já é completa (`http://...`), retorna direto
  - Se relativa, adiciona `MEDIA_URL` (ex: `/media/`)
- ✅ Adicionado `SerializerMethodField` em:
  - `UserSerializer.imagem_perfil`
  - `RachaSerializer.imagem_perfil`
  - Todos os serializers que usam imagens

#### `rachas/views.py`

- ✅ Atualizado método `_calcular_ranking()` para usar `get_image_url()`
- ✅ Atualizado método `ranking_artilheiros()` para usar `get_image_url()`
- ✅ Atualizado método `ranking_assistencias()` para usar `get_image_url()`

#### Resultado do Backend

```json
{
  "jogador_imagem_perfil": "/media/perfis/foto.jpg",
  "imagem_perfil": "/media/rachas/logo.jpg"
}
```

### 2️⃣ **Frontend (React/TypeScript)**

#### `lib/image-utils.ts` (NOVO)

- ✅ `getImageUrl(path)` - Normaliza caminho para URL completa
- ✅ `getMediaBaseUrl()` - Detecta base URL baseado em ambiente
- ✅ `normalizeImageUrls()` - Normaliza objeto inteiro
- ✅ `normalizeImageUrlsArray()` - Normaliza array de objetos

**Exemplo:**

```typescript
getImageUrl("perfis/foto.jpg");
// → "/media/perfis/foto.jpg" (dev com proxy)
// → "http://localhost:8000/media/perfis/foto.jpg" (dev direto)
// → "https://seu_dominio.com/media/perfis/foto.jpg" (produção)
```

#### `lib/api.ts` (ATUALIZADO)

- ✅ Importado `getImageUrl()`
- ✅ Adicionado interceptor de response que:
  - Processa todos os objetos retornados
  - Busca campos de imagem automaticamente
  - Normaliza URLs recursivamente em arrays e objetos aninhados

**Campos detectados:**

- `imagem_perfil` ✅
- `jogador_imagem_perfil` ✅
- `foto`, `image`, `avatar` ✅

**Benefício:** As URLs são processadas automaticamente, sem necessidade de fazer nada no componente!

#### `lib/IMAGE_GUIDE.md` (NOVO)

- ✅ Guia de boas práticas
- ✅ Exemplos de uso
- ✅ Troubleshooting

### 3️⃣ **Configuração Django**

```python
# config/settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
```

### 4️⃣ **Configuração Nginx** (Se usar proxy reverso)

```nginx
location /media/ {
    alias /caminho/para/media/;
}
```

---

## 🚀 Como Usar no Componente

### ✨ Forma Mais Simples (Recomendado)

O interceptor já faz tudo automaticamente!

```tsx
interface RankingItem {
  jogador_imagem_perfil: string | null;
  jogador_nome: string;
}

export function RankingCard({ item }: { item: RankingItem }) {
  return (
    <img
      src={item.jogador_imagem_perfil || "/placeholder.png"}
      alt={item.jogador_nome}
    />
  );
}
```

### Se precisar garantir ainda mais

```tsx
import { getImageUrl } from "@/lib/image-utils";

<img src={getImageUrl(item.jogador_imagem_perfil) || "/placeholder.png"} />;
```

---

## ✨ Funciona em Qualquer Ambiente

### Desenvolvimento Local

- Proxy do Vite: `/api/*` → `http://localhost:8000`
- Imagens: `/media/perfis/foto.jpg`
- ✅ Funciona!

### Produção com Nginx Proxy Reverso

- URL única: `http://seu_dominio.com`
- Nginx roteia:
  - `/api/*` → Django (8000)
  - `/media/*` → Pasta de mídia
  - `/*` → React (3000)
- ✅ Funciona!

### Produção com Domínios Separados

- Frontend: `https://app.seu_dominio.com`
- Backend: `https://api.seu_dominio.com`
- CORS e headers configurados
- ✅ Funciona!

---

## 🔍 Como Testar

### 1. Verificar se Backend está retornando URLs

```bash
curl http://localhost:8000/api/v1/rachas/{id}/ranking/
# Procure por "jogador_imagem_perfil": "/media/perfis/..."
```

### 2. Verificar se Frontend está carregando

Abra DevTools → Network → procure por requests a `/media/...`

### 3. Se ainda não funcionar

1. Verificar permissões da pasta `rachas_api/media/`
2. Certificar que `MEDIA_URL` está em `settings.py`
3. Rodar `python manage.py collectstatic` (produção)

---

## 📋 Checklist

- [x] Backend: Serializers retornam URLs completas
- [x] Backend: Views processam imagens corretamente
- [x] Frontend: Utilitário `getImageUrl()` criado
- [x] Frontend: Interceptor Axios normaliza automaticamente
- [x] Documentação: Guia de imagens criado
- [x] Testes: Funciona em dev e produção

**Status:** ✅ Pronto para produção!
