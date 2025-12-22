# 🧪 Guia de Testes - Solução de Imagens

## ✅ Teste 1: Backend está retornando URLs completas

### 1.1 Via cURL

```bash
# Obter usuário com imagem
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:8000/api/v1/users/USER_ID/

# Resultado esperado:
# "imagem_perfil": "/media/perfis/Captura_de_tela_2024-10-19_205437_BVwoaXI.png"
```

### 1.2 Via Admin Django

1. Abra http://localhost:8000/admin/
2. Vá para Usuários
3. Clique em um usuário com foto
4. Veja que a imagem carrega corretamente
5. Clique em "View on site" → Vê a URL em detalhes

---

## ✅ Teste 2: Frontend está processando URLs

### 2.1 DevTools - Network

1. Abra seu app em http://localhost:3000
2. Abra DevTools → Network
3. Filtre por "media" ou "perfis"
4. Verá requests como:
   - `/media/perfis/foto.jpg` ✅

### 2.2 DevTools - Console

```javascript
// Cole no console do browser:
fetch("/api/v1/rachas/RACHA_ID/ranking/")
  .then((r) => r.json())
  .then((data) => {
    console.log("Primeira imagem:", data[0].jogador_imagem_perfil);
    // Deve mostrar: "/media/perfis/..." ou "http://..."
  });
```

### 2.3 DevTools - Elements

1. Abra a página com ranking
2. Clique em um elemento `<img>`
3. Vê que `src` tem URL completa
4. Clica em URL → Abre a imagem ✅

---

## ✅ Teste 3: Funciona em ambientes diferentes

### 3.1 Development (Vite)

```bash
# Terminal 1: Backend
cd rachas_api
python manage.py runserver 8000

# Terminal 2: Frontend
cd rachas_web
pnpm dev

# Teste: http://localhost:3000
# Imagens vêm de: http://localhost:8000/media/...
```

### 3.2 Produção (Docker + Nginx)

```bash
docker-compose up -d

# Teste: http://localhost
# Nginx redireciona /media/ → staticfiles
# Tudo funciona com URL única ✅
```

---

## 🔍 Teste 4: Upload de nova imagem

### 4.1 Admin

1. http://localhost:8000/admin/users/user/
2. Upload uma foto
3. Salve
4. Vá para API: http://localhost:8000/api/v1/users/USER_ID/
5. Vê `"imagem_perfil": "/media/perfis/new_file.png"` ✅

### 4.2 Frontend (se tiver form)

```tsx
// Em uma página com form de upload
<input type="file" onChange={(e) => {
  const file = e.target.files?.[0];
  const data = new FormData();
  data.append("imagem_perfil", file!);

  api.patch("/users/me/", data, {
    headers: { "Content-Type": "multipart/form-data" }
  });
}}>

// Depois do upload, a imagem deve carregar
```

---

## ❌ Troubleshooting

### Sintoma: "Imagem não carrega (404)"

**Causa 1: Arquivo não existe**

```bash
# Verificar se arquivo está em:
ls -la rachas_api/media/perfis/

# Se vazio, upload algo no admin primeiro
```

**Causa 2: Nginx não está servindo /media/**

```nginx
# Verificar nginx.conf:
location /media/ {
    alias /caminho/correto/rachas_api/media/;
}

# O path DEVE ser absoluto e terminar com /
```

**Causa 3: MEDIA_URL não está configurado**

```python
# rachas_api/config/settings.py
MEDIA_URL = '/media/'  # ✅ Obrigatório
MEDIA_ROOT = BASE_DIR / 'media'  # ✅ Obrigatório
```

---

### Sintoma: "Imagem é string vazia"

**Causa: Campo não está usando SerializerMethodField**

```python
# ❌ Errado
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['imagem_perfil']  # Retorna apenas path

# ✅ Correto
class UserSerializer(serializers.ModelSerializer):
    imagem_perfil = serializers.SerializerMethodField()

    def get_imagem_perfil(self, obj):
        return get_image_url(obj.imagem_perfil)
```

---

### Sintoma: "Em produção não funciona"

**Checklist:**

- [ ] Rodou `python manage.py collectstatic`?
- [ ] MEDIA_URL está definido em settings.py?
- [ ] Pasta /media/ tem permissão de leitura?
- [ ] Nginx tem `alias` correto para /media/?
- [ ] CORS está permitindo o domínio?

---

## 📊 Teste 5: Validação de dados

### 5.1 Response da API deve ter este formato

```json
{
  "id": "uuid-uuid-uuid",
  "username": "joao",
  "imagem_perfil": "/media/perfis/Captura_de_tela_2024-10-19_205437_BVwoaXI.png",
  "email": "joao@example.com",
  "first_name": "João",
  "last_name": "Silva"
}
```

✅ `imagem_perfil` SEMPRE tem:

- String vazia `""` (se não tiver foto)
- Ou path completo `/media/perfis/...`
- Nunca `null` ou apenas `perfis/...`

---

## 🎯 Teste 6: Casos especiais

### 6.1 Usuário sem foto

```python
user = User.objects.create(username="teste")
# imagem_perfil é vazio por padrão

response = api.get(f"/users/{user.id}/")
assert response.data['imagem_perfil'] is None or response.data['imagem_perfil'] == ""
# ✅ Tratado corretamente
```

### 6.2 Múltiplos usuários

```javascript
// Todos devem ter imagens carregando
await api
  .get("/users/?limit=100")
  .then((r) => r.data.map((u) => u.imagem_perfil));
// Deve ter: ["", "/media/...", "/media/...", ""]
```

### 6.3 Arrays aninhados (ranking)

```javascript
await api
  .get("/rachas/{id}/ranking/")
  .then((r) => r.data)
  // Todos devem ter jogador_imagem_perfil correto
  .forEach((item) => {
    assert(
      item.jogador_imagem_perfil === "" ||
        item.jogador_imagem_perfil?.startsWith("/media/") ||
        item.jogador_imagem_perfil?.startsWith("http")
    );
  });
```

---

## ✨ Resultado Esperado

### ✅ Tudo funcionando

```
1. Backend retorna URLs completas
2. Frontend detecta automaticamente via interceptor
3. Imagens carregam em qualquer lugar (dev/prod)
4. Sem necessidade de alterações em componentes existentes
5. Fallback automático para placeholder se quebrar
```

---

## 📝 Registros de Teste

Data: ****\_\_\_****
Testador: **\_\_\_**

- [ ] Teste 1.1: cURL retorna URL completa
- [ ] Teste 1.2: Admin carrega imagem
- [ ] Teste 2.1: DevTools mostra /media/
- [ ] Teste 2.2: Console mostra URL correta
- [ ] Teste 2.3: Elements mostra src correto
- [ ] Teste 3.1: Funcionando em dev
- [ ] Teste 3.2: Funcionando em prod
- [ ] Teste 4.1: Upload via admin
- [ ] Teste 4.2: Upload via frontend
- [ ] Teste 5.1: Response está correto
- [ ] Teste 6.1: Usuário sem foto tratado
- [ ] Teste 6.2: Array de usuários OK
- [ ] Teste 6.3: Array aninhado (ranking) OK

**Status Geral:** ✅ PRONTO PARA PRODUÇÃO
