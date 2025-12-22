/**
 * Utilidade para construir URLs de imagens de forma robusta
 * Funciona tanto em desenvolvimento quanto em produção
 */

/**
 * Retorna a URL completa de uma imagem
 * @param imagePath - Caminho relativo ou URL completa da imagem
 * @returns URL completa da imagem
 */
export function getImageUrl(
  imagePath: string | null | undefined
): string | null {
  if (!imagePath) {
    return null;
  }

  // Se já é uma URL completa, retorna direto
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // Se começa com /, usa a base URL da API
  if (imagePath.startsWith("/")) {
    return getMediaBaseUrl() + imagePath;
  }

  // Caso contrário, assume que é um caminho relativo de mídia
  return getMediaBaseUrl() + imagePath;
}

/**
 * Retorna a base URL para mídia (com trailing slash)
 */
export function getMediaBaseUrl(): string {
  // Em desenvolvimento: http://localhost:8000/media/
  // Em produção com proxy reverso: /media/
  // Em produção com domínio próprio: https://seu_dominio.com/media/

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  // Extrair base da API e substituir /api por /media
  const baseUrl = apiUrl.replace("/api", "");

  // Garantir que termina com /media/
  if (baseUrl.endsWith("/")) {
    return baseUrl + "media/";
  }

  return baseUrl + "/media/";
}

/**
 * Hook para normalizar URLs de imagens em objetos
 * Útil para transformar dados da API antes de usar
 */
export function normalizeImageUrls<T extends Record<string, any>>(
  data: T,
  imageFields: (keyof T)[]
): T {
  const normalized = { ...data } as any;

  imageFields.forEach(field => {
    if (normalized[field]) {
      normalized[field] = getImageUrl(normalized[field] as string);
    }
  });

  return normalized;
}

/**
 * Hook para normalizar arrays de objetos com imagens
 */
export function normalizeImageUrlsArray<T extends Record<string, any>>(
  data: T[],
  imageFields: (keyof T)[]
): T[] {
  return data.map(item => normalizeImageUrls(item, imageFields));
}
