/\*\*

- GUIA: Como usar imagens no Frontend
-
- O sistema está configurado para retornar URLs completas de imagens
- Mas também possui um sistema de normalização automática em caso de URLs relativas
  \*/

// ========================================
// OPÇÃO 1: Usar a URL diretamente (recomendado)
// ========================================
// O backend e o interceptor do Axios já garantem que as URLs estejam completas

import api from "@/lib/api";

const handleGetRanking = async () => {
const response = await api.get("/rachas/{id}/ranking/");
// response.data[0].jogador_imagem_perfil já virá com URL completa
// Ex: "/media/perfis/foto.jpg" ou "http://localhost:8000/media/perfis/foto.jpg"

response.data.forEach(jogador => {
console.log(jogador.jogador_imagem_perfil); // URL completa pronta para usar
});
};

// ========================================
// OPÇÃO 2: Usar em componentes React
// ========================================
import { getImageUrl } from "@/lib/image-utils";

interface RankingItem {
jogador_id: string;
jogador_nome: string;
jogador_imagem_perfil: string | null;
}

export function RankingCard({ jogador }: { jogador: RankingItem }) {
return (
<div>
<img
src={jogador.jogador_imagem_perfil || "/placeholder.png"}
alt={jogador.jogador_nome}
/>
<p>{jogador.jogador_nome}</p>
</div>
);
}

// ========================================
// OPÇÃO 3: Garantir URL mesmo com dados incompletos
// ========================================
import { getImageUrl } from "@/lib/image-utils";

const caminhoRelativo = "perfis/foto.jpg";
const urlCompleta = getImageUrl(caminhoRelativo);
// Resultado: "/media/perfis/foto.jpg" ou "http://localhost:8000/media/perfis/foto.jpg"

// ========================================
// OPÇÃO 4: Normalizar um objeto inteiro
// ========================================
import { normalizeImageUrls } from "@/lib/image-utils";

const user = {
id: "123",
name: "João",
imagem_perfil: "perfis/joao.jpg",
};

const normalized = normalizeImageUrls(user, ["imagem_perfil"]);
// normalized.imagem_perfil agora tem URL completa

// ========================================
// OPÇÃO 5: Normalizar array de objetos
// ========================================
import { normalizeImageUrlsArray } from "@/lib/image-utils";

const jogadores = [
{ name: "João", imagem_perfil: "perfis/joao.jpg" },
{ name: "Maria", imagem_perfil: "perfis/maria.jpg" },
];

const normalizedJogadores = normalizeImageUrlsArray(jogadores, ["imagem_perfil"]);

// ========================================
// COMO FUNCIONA NO BACKEND
// ========================================

/\*
Settings do Django (config/settings.py):
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

Serializer do Django (rachas/serializers.py):
class UserSerializer(serializers.ModelSerializer):
imagem_perfil = serializers.SerializerMethodField()

    def get_imagem_perfil(self, obj):
      return get_image_url(obj.imagem_perfil)
      # Retorna: "/media/perfis/foto.jpg"

Nginx (nginx.conf):
location /media/ {
alias /caminho/para/media/;
}
\*/

// ========================================
// VARIÁVEIS DE AMBIENTE
// ========================================

/\*
Arquivo: .env (raiz do projeto)

# Development

VITE_API_URL=http://localhost:8000/api

# Production

VITE_API_URL=https://seu_dominio.com/api

A função getMediaBaseUrl() detecta automaticamente e usa
\*/

// ========================================
// SEGURANÇA: ALWAYS FALLBACK
// ========================================

// Sempre use um fallback para imagens quebradas:
<img
src={jogador.jogador_imagem_perfil || "/placeholder-avatar.png"}
alt={jogador.jogador_nome}
onError={(e) => {
(e.target as HTMLImageElement).src = "/placeholder-avatar.png";
}}
/>

// ========================================
// TROUBLESHOOTING
// ========================================

/\*
❌ "Imagem não carrega"
→ Verificar se a URL começa com http ou /media/
→ Verificar se o arquivo existe em rachas_api/media/

❌ "404 em /media/perfis/..."
→ Nginx não está servindo /media/ corretamente
→ Ver nginx.conf e verificar alias/location

❌ "Em produção, imagens aparecem quebradas"
→ Usar getImageUrl() ou normalizeImageUrls() antes de renderizar
→ Certificar que MEDIA_URL está configurado no settings.py

✅ "Tudo funcionando!"
→ O interceptor do Axios normaliza automaticamente
→ Use a URL como vim da API
\*/
