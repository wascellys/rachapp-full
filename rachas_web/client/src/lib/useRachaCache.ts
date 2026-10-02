/**
 * useRachaCache.ts
 *
 * Cache simples com sessionStorage + TTL para os dados de um racha.
 * - Dados ficam em cache por 2 minutos (TTL_MS)
 * - Invalidados automaticamente ao mudar de racha ou expirar
 */

const TTL_MS = 2 * 60 * 1000; // 2 minutos

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + TTL_MS };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage cheio — ignora silenciosamente
  }
}

export function invalidateRachaCache(rachaId: string): void {
  try {
    // Remove todas as entradas do racha (ex.: racha:<id>:all, racha:<id>:stats)
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(`racha:${rachaId}:`))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {
    // sessionStorage indisponível — nada a invalidar
  }
}

export { cacheGet, cacheSet };
