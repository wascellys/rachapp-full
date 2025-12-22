#!/bin/bash
# Script de verificação das imagens

echo "🖼️  VERIFICANDO CONFIGURAÇÃO DE IMAGENS"
echo "======================================"

# 1. Verificar se settings.py tem MEDIA_URL
echo ""
echo "1. Verificando MEDIA_URL em settings.py..."
if grep -q "MEDIA_URL = '/media/'" rachas_api/config/settings.py; then
    echo "   ✅ MEDIA_URL configurado"
else
    echo "   ❌ MEDIA_URL não encontrado"
fi

# 2. Verificar se models.py tem o método
echo ""
echo "2. Verificando método get_imagem_perfil_url()..."
if grep -q "def get_imagem_perfil_url" rachas_api/rachas/models.py; then
    echo "   ✅ Método criado no modelo User"
else
    echo "   ❌ Método não encontrado"
fi

# 3. Verificar se serializers tem get_image_url
echo ""
echo "3. Verificando função get_image_url() em serializers..."
if grep -q "def get_image_url" rachas_api/rachas/serializers.py; then
    echo "   ✅ Função helper criada"
else
    echo "   ❌ Função não encontrada"
fi

# 4. Verificar se frontend tem image-utils
echo ""
echo "4. Verificando image-utils.ts..."
if [ -f "rachas_web/client/src/lib/image-utils.ts" ]; then
    echo "   ✅ Arquivo criado"
    if grep -q "export function getImageUrl" rachas_web/client/src/lib/image-utils.ts; then
        echo "   ✅ Funções exportadas"
    fi
else
    echo "   ❌ Arquivo não encontrado"
fi

# 5. Verificar se api.ts foi atualizado
echo ""
echo "5. Verificando interceptor em api.ts..."
if grep -q "processImageUrls" rachas_web/client/src/lib/api.ts; then
    echo "   ✅ Interceptor de imagens adicionado"
else
    echo "   ❌ Interceptor não encontrado"
fi

# 6. Verificar pasta de mídia
echo ""
echo "6. Verificando pasta de mídia..."
if [ -d "rachas_api/media" ]; then
    echo "   ✅ Pasta media/ existe"
    if [ -d "rachas_api/media/perfis" ]; then
        echo "   ✅ Pasta perfis/ existe"
        FILE_COUNT=$(find rachas_api/media/perfis -type f | wc -l)
        echo "   📊 Total de arquivos: $FILE_COUNT"
    fi
else
    echo "   ⚠️  Pasta media/ não encontrada (será criada na primeira upload)"
fi

echo ""
echo "======================================"
echo "✅ Verificação concluída!"
echo ""
echo "Próximos passos:"
echo "1. Reiniciar o Django: python manage.py runserver"
echo "2. Testar upload de imagem no /admin"
echo "3. Verificar endpoint: /api/v1/users/{id}/"
echo "   A resposta deve ter: 'imagem_perfil': '/media/perfis/...'"
