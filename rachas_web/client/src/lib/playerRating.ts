/**
 * Atributos estilo "Ultimate Team" para a carta do jogador.
 *
 * Cada atributo vai de 40 a 99. Atributos por partida são amortecidos quando o
 * jogador tem poucos jogos (um hat-trick na estreia não vira 99 de cara).
 */
import { posicaoSigla } from "./format";

export interface PlayerCardData {
  name: string;
  username?: string;
  position?: string | null;
  /** Pontuação total no racha (regras de pontos do racha) */
  points: number;
  stats: { matches: number; goals: number; assists: number; awards?: number };
  photo?: string | null;
  /** Posição no ranking (1º, 2º...) — opcional */
  rank?: number;
}

export type CardTier = "bronze" | "prata" | "ouro" | "lenda";

export interface Atributo {
  sigla: string;
  nome: string;
  valor: number;
}

export interface CardRating {
  overall: number;
  tier: CardTier;
  atributos: Atributo[];
  sigla: string;
  /** 0..1 — progresso até a próxima raridade */
  progresso: number;
  proximoTier: CardTier | null;
}

const MIN = 40;
const MAX = 99;
const clamp = (v: number) => Math.max(MIN, Math.min(MAX, Math.round(v)));

export const TIER_LIMITES: { tier: CardTier; min: number }[] = [
  { tier: "lenda", min: 85 },
  { tier: "ouro", min: 75 },
  { tier: "prata", min: 62 },
  { tier: "bronze", min: 0 },
];

export function calcularRating(data: Pick<PlayerCardData, "stats" | "position">): CardRating {
  const { matches, goals, assists } = data.stats;
  const awards = data.stats.awards ?? 0;
  const jogos = Math.max(matches, 0);
  // Confiança cresce até 5 jogos; antes disso puxa os atributos por jogo para a base
  const confianca = Math.min(1, jogos / 5);
  const porJogo = (total: number) => (jogos > 0 ? total / jogos : 0);
  const amortecer = (bruto: number) => MIN + (bruto - MIN) * confianca;

  const fin = clamp(amortecer(MIN + porJogo(goals) * 25));
  const pas = clamp(amortecer(MIN + porJogo(assists) * 35));
  const dec = clamp(amortecer(MIN + porJogo(goals + assists) * 18));
  const fre = clamp(MIN + jogos * 3);
  const prm = clamp(MIN + awards * 10);

  const overall = clamp(0.25 * fin + 0.2 * pas + 0.25 * dec + 0.15 * fre + 0.15 * prm);
  const idx = TIER_LIMITES.findIndex(t => overall >= t.min);
  const tier = TIER_LIMITES[idx].tier;
  const proximo = idx > 0 ? TIER_LIMITES[idx - 1] : null;
  const atual = TIER_LIMITES[idx].min || MIN;
  const progresso = proximo ? Math.min(1, (overall - atual) / (proximo.min - atual)) : 1;

  return {
    overall,
    tier,
    sigla: posicaoSigla(data.position),
    progresso,
    proximoTier: proximo?.tier ?? null,
    atributos: [
      { sigla: "FIN", nome: "Finalização", valor: fin },
      { sigla: "PAS", nome: "Passe", valor: pas },
      { sigla: "DEC", nome: "Decisivo", valor: dec },
      { sigla: "FRE", nome: "Frequência", valor: fre },
      { sigla: "PRM", nome: "Prêmios", valor: prm },
    ],
  };
}

export interface TierTheme {
  label: string;
  /** Fundo da carta */
  bg: string;
  /** Moldura metálica */
  frame: string;
  /** Cor do texto principal (OVR, nome) */
  ink: string;
  /** Cor de rótulos secundários */
  inkSoft: string;
  accent: string;
  glow: string;
  foil: boolean;
}

export const TIER_THEME: Record<CardTier, TierTheme> = {
  bronze: {
    label: "Bronze",
    bg: "radial-gradient(120% 90% at 50% 0%, #c48a55 0%, #8a5428 45%, #5a3418 100%)",
    frame: "linear-gradient(145deg,#f1c79a,#a4652f 35%,#5e3414 60%,#d9a06a)",
    ink: "#fff1df",
    inkSoft: "#f3cfa6",
    accent: "#ffcf99",
    glow: "0 18px 40px -12px rgba(160,90,40,.65)",
    foil: false,
  },
  prata: {
    label: "Prata",
    bg: "radial-gradient(120% 90% at 50% 0%, #f1f5f9 0%, #b4bec9 45%, #8d99a6 100%)",
    frame: "linear-gradient(145deg,#ffffff,#a9b4bf 35%,#56616d 60%,#e9eef3)",
    ink: "#0f172a",
    inkSoft: "#1e293b",
    accent: "#1e293b",
    glow: "0 18px 40px -12px rgba(148,163,184,.7)",
    foil: false,
  },
  ouro: {
    label: "Ouro",
    bg: "radial-gradient(120% 90% at 50% 0%, #fff1bf 0%, #e8b93f 45%, #c8961f 100%)",
    frame: "linear-gradient(145deg,#fff6c9,#d9a520 35%,#7a5300 60%,#ffe28a)",
    ink: "#2b1d00",
    inkSoft: "#3d2a00",
    accent: "#3d2a00",
    glow: "0 20px 46px -12px rgba(234,179,8,.75)",
    foil: true,
  },
  lenda: {
    label: "Lenda",
    bg: "radial-gradient(120% 90% at 50% 0%, #3b2a7a 0%, #1b1046 45%, #0b0820 100%)",
    frame: "linear-gradient(145deg,#7dd3fc,#a855f7 30%,#f472b6 55%,#facc15 80%,#7dd3fc)",
    ink: "#f5f3ff",
    inkSoft: "#c4b5fd",
    accent: "#facc15",
    glow: "0 22px 54px -12px rgba(168,85,247,.85)",
    foil: true,
  },
};
