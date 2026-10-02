import type { CardTier } from "./playerRating";

export type Raridade = "BRONZE" | "PRATA" | "OURO" | "LENDA";
export const RARIDADES: Raridade[] = ["BRONZE", "PRATA", "OURO", "LENDA"];

/** Reaproveita o tema visual das cartas para cada raridade de figurinha. */
export const RARIDADE_TIER: Record<Raridade, CardTier> = {
  BRONZE: "bronze",
  PRATA: "prata",
  OURO: "ouro",
  LENDA: "lenda",
};

export type Pesos = Record<Raridade, number>;
export const PESOS_PADRAO: Pesos = { BRONZE: 60, PRATA: 28, OURO: 10, LENDA: 2 };

export interface JogadorAlbum {
  id: string;
  nome: string;
  username: string;
  posicao: string;
  imagem_perfil: string | null;
  ativo?: boolean;
}

export interface FigurinhaSlot {
  id: string;
  numero: number;
  raridade: Raridade;
  quantidade: number;
  colada: boolean;
}

export interface PaginaAlbum {
  id: string;
  numero: number;
  jogador: JogadorAlbum;
  figurinhas: FigurinhaSlot[];
}

export interface AlbumInfo {
  id: string;
  titulo: string;
  pesos: Pesos;
  criado_em: string;
  total_paginas: number;
  total_figurinhas: number;
}

export interface Progresso {
  total: number;
  coladas: number;
  para_colar: number;
  repetidas: number;
  percentual: number;
  por_raridade: Record<Raridade, { coladas: number; total: number }>;
}

export interface Colecionador extends JogadorAlbum {
  coladas: number;
  percentual: number;
}

export interface AlbumResponse {
  existe: boolean;
  is_admin: boolean;
  racha_nome: string;
  album?: AlbumInfo;
  paginas?: PaginaAlbum[];
  progresso?: Progresso;
  pacotes_fechados?: { id: string; quantidade_figurinhas: number; motivo: string; criado_em: string }[];
  colecionadores?: Colecionador[];
}

export interface FigurinhaSorteada {
  id: string;
  numero: number;
  raridade: Raridade;
  nova: boolean;
  jogador: JogadorAlbum;
}

export function percentuais(pesos: Pesos): Pesos {
  const total = RARIDADES.reduce((s, r) => s + (pesos[r] || 0), 0) || 1;
  return Object.fromEntries(RARIDADES.map(r => [r, ((pesos[r] || 0) * 100) / total])) as Pesos;
}

export function numeroFigurinha(n: number) {
  return `#${String(n).padStart(3, "0")}`;
}

/**
 * Estima, por simulação, quantos pacotes um jogador precisa abrir para atingir
 * 25%, 50%, 75% e 100% do álbum sozinho (sem trocas). Ajuda o admin a calibrar
 * o tamanho dos pacotes e os pesos. Resultado é a mediana das simulações.
 */
export function estimarPacotes(paginas: number, pesos: Pesos, figurinhasPorPacote: number, simulacoes = 120) {
  const ativas = RARIDADES.filter(r => (pesos[r] || 0) > 0);
  const total = paginas * RARIDADES.length;
  const alcancavel = paginas * ativas.length;
  const metas = [0.25, 0.5, 0.75, 1];
  if (paginas <= 0 || figurinhasPorPacote <= 0 || ativas.length === 0) {
    return { metas: metas.map(m => ({ meta: m, pacotes: null as number | null })), alcancavel, total };
  }
  const somaPesos = ativas.reduce((s, r) => s + pesos[r], 0);
  const acumulado: number[] = [];
  ativas.reduce((s, r) => (acumulado.push(s + pesos[r] / somaPesos), s + pesos[r] / somaPesos), 0);

  const LIMITE_PACOTES = 2000;
  const resultados: (number | null)[][] = metas.map(() => []);
  for (let sim = 0; sim < simulacoes; sim++) {
    const tem = new Uint8Array(total);
    let unicas = 0;
    let metaIdx = 0;
    for (let pacote = 1; pacote <= LIMITE_PACOTES && metaIdx < metas.length; pacote++) {
      for (let i = 0; i < figurinhasPorPacote; i++) {
        const x = Math.random();
        let r = acumulado.findIndex(a => x <= a);
        if (r < 0) r = ativas.length - 1;
        const raridade = RARIDADES.indexOf(ativas[r]);
        const idx = Math.floor(Math.random() * paginas) * RARIDADES.length + raridade;
        if (!tem[idx]) {
          tem[idx] = 1;
          unicas++;
        }
      }
      while (metaIdx < metas.length && unicas >= Math.ceil(metas[metaIdx] * total)) {
        resultados[metaIdx].push(pacote);
        metaIdx++;
      }
    }
    for (; metaIdx < metas.length; metaIdx++) resultados[metaIdx].push(null);
  }
  const mediana = (valores: (number | null)[]) => {
    const ordenados = valores.map(v => (v === null ? Infinity : v)).sort((a, b) => a - b);
    const m = ordenados[Math.floor(ordenados.length / 2)];
    return Number.isFinite(m) ? m : null;
  };
  return { metas: metas.map((meta, i) => ({ meta, pacotes: mediana(resultados[i]) })), alcancavel, total };
}

/** Sugestão de figurinhas por pacote: cresce com o álbum (≈ páginas ÷ 4), entre 5 e 15. */
export function sugerirFigurinhasPorPacote(paginas: number) {
  return Math.min(15, Math.max(5, Math.round(paginas / 4)));
}
