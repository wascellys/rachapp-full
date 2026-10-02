import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { iniciais, posicaoLabel } from "@/lib/format";
import {
  calcularRating,
  TIER_THEME,
  type CardRating,
  type PlayerCardData,
  type TierTheme,
} from "@/lib/playerRating";
import "./styles/PlayerCard.css";

export const CARD_W = 260;
export const CARD_H = 380;

/* Escudo com cantos chanfrados e base em ponta suave */
const SHIELD = "polygon(50% 0%, 93% 3.5%, 100% 9%, 100% 90%, 50% 100%, 0% 90%, 0% 9%, 7% 3.5%)";

interface FaceProps {
  player: PlayerCardData;
  rating: CardRating;
  theme: TierTheme;
}

function Shell({ theme, children, foil }: { theme: TierTheme; children: React.ReactNode; foil?: boolean }) {
  return (
    <div className="rc-shell" style={{ clipPath: SHIELD, background: theme.frame }}>
      <div className="rc-inner" style={{ clipPath: SHIELD, background: theme.bg }}>
        <div className="rc-pattern" />
        {foil && <div className="rc-foil" />}
        <div className="rc-glare" />
        {children}
      </div>
    </div>
  );
}

function Estrelas({ tier, cor }: { tier: CardRating["tier"]; cor: string }) {
  const n = { bronze: 1, prata: 2, ouro: 3, lenda: 4 }[tier];
  return (
    <div className="flex gap-0.5" aria-label={`${n} estrelas`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <svg key={i} width="9" height="9" viewBox="0 0 24 24" fill={i < n ? cor : "none"} stroke={cor} strokeWidth="2" opacity={i < n ? 1 : 0.35}>
          <path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18.3 5.5 22l1.7-7.4-5.7-5 7.5-.7z" />
        </svg>
      ))}
    </div>
  );
}

export function PlayerCardFront({ player, rating, theme }: FaceProps) {
  const nomeExibido = (player.name.length > 14 && player.username ? player.username : player.name) || "Jogador";
  const atributos = [...rating.atributos.slice(0, 5), { sigla: "PTS", nome: "Pontos", valor: player.points }];
  const [fotoFalhou, setFotoFalhou] = useState(false);

  useEffect(() => setFotoFalhou(false), [player.photo]);

  return (
    <Shell theme={theme} foil={theme.foil}>
      {/* Foto / silhueta */}
      <div className="rc-photo">
        {player.photo && !fotoFalhou ? (
          // Sem crossOrigin: o bucket R2 não envia cabeçalhos CORS e a imagem seria bloqueada.
          // O compartilhamento usa uma URL blob: obtida pelo proxy da API.
          <img src={player.photo} alt="" draggable={false} onError={() => setFotoFalhou(true)} />
        ) : (
          <div className="rc-photo-fallback" style={{ color: theme.ink }}>
            <svg viewBox="0 0 100 100" aria-hidden className="rc-silhouette" fill="currentColor">
              <circle cx="50" cy="34" r="17" />
              <path d="M14 100c2-24 17-36 36-36s34 12 36 36z" />
            </svg>
            <span className="rc-initials" style={{ color: theme.ink }}>{iniciais(player.name)}</span>
          </div>
        )}
      </div>

      {/* OVR + posição */}
      <div className="absolute z-20 flex flex-col items-center leading-none" style={{ top: 30, left: 22, color: theme.ink }}>
        <span className="rc-ovr">{rating.overall}</span>
        <span className="rc-pos">{rating.sigla}</span>
        <div className="my-1.5 h-px w-7" style={{ background: theme.inkSoft, opacity: 0.6 }} />
        {player.rank ? <span className="rc-rank">#{player.rank}</span> : <Estrelas tier={rating.tier} cor={theme.ink} />}
      </div>

      {/* Raridade */}
      <div className="absolute z-20 flex flex-col items-end gap-1" style={{ top: 30, right: 20 }}>
        <span className="rc-chip" style={{ color: theme.ink, borderColor: theme.inkSoft }}>{theme.label}</span>
        {player.rank ? <Estrelas tier={rating.tier} cor={theme.ink} /> : null}
      </div>

      {/* Nome + atributos */}
      <div className="absolute inset-x-0 z-20 flex flex-col items-center px-5" style={{ bottom: 34, color: theme.ink }}>
        <h3 className="rc-name" title={player.name} style={{ fontSize: nomeExibido.length > 13 ? 20 : undefined }}>{nomeExibido}</h3>
        <div className="mb-2 mt-1 h-px w-4/5" style={{ background: `linear-gradient(90deg,transparent,${theme.inkSoft},transparent)` }} />
        <div className="grid w-full grid-cols-3 gap-x-2 gap-y-1">
          {atributos.map(a => (
            <div key={a.sigla} className="flex items-baseline justify-center gap-1" title={a.nome}>
              <span className="rc-attr-val">{a.valor}</span>
              <span className="rc-attr-lbl" style={{ color: theme.inkSoft }}>{a.sigla}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rc-brand" style={{ color: theme.inkSoft }}>RACHAPP</div>
    </Shell>
  );
}

function Radar({ rating, theme }: { rating: CardRating; theme: TierTheme }) {
  const size = 150;
  const c = size / 2;
  const r = 42;
  const n = rating.atributos.length;
  const ponto = (i: number, v: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const raio = (r * (v - 30)) / (99 - 30);
    return [c + Math.cos(ang) * raio, c + Math.sin(ang) * raio];
  };
  const borda = (frac: number) =>
    rating.atributos.map((_, i) => ponto(i, 30 + (99 - 30) * frac).join(",")).join(" ");
  const area = rating.atributos.map((a, i) => ponto(i, a.valor).join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radar de atributos" style={{ overflow: "visible" }}>
      {[0.33, 0.66, 1].map(f => (
        <polygon key={f} points={borda(f)} fill="none" stroke={theme.inkSoft} strokeOpacity={0.35} strokeWidth={1} />
      ))}
      <polygon points={area} fill={theme.accent} fillOpacity={0.28} stroke={theme.ink} strokeWidth={1.5} strokeLinejoin="round" />
      {rating.atributos.map((a, i) => {
        const [x, y] = ponto(i, 99 + 20);
        return (
          <text key={a.sigla} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontWeight="900" fill={theme.ink}>
            {a.sigla} {a.valor}
          </text>
        );
      })}
    </svg>
  );
}

export function PlayerCardBack({ player, rating, theme }: FaceProps) {
  const { matches, goals, assists } = player.stats;
  const awards = player.stats.awards ?? 0;
  const itens = [
    { label: "Jogos", valor: matches },
    { label: "Gols", valor: goals },
    { label: "Assist.", valor: assists },
    { label: "Prêmios", valor: awards },
    { label: "Pontos", valor: player.points },
    { label: "G+A/J", valor: matches > 0 ? ((goals + assists) / matches).toFixed(1) : "0.0" },
  ];
  const proximo = rating.proximoTier ? TIER_THEME[rating.proximoTier].label : null;

  return (
    <Shell theme={theme}>
      <div className="relative z-20 flex h-full flex-col items-center px-5 pb-10 pt-8" style={{ color: theme.ink }}>
        <div className="flex w-full items-center justify-between">
          <div className="min-w-0">
            <p className="rc-back-name truncate" style={{ fontSize: (player.name || "").length > 13 ? 16 : undefined }}>{player.name || "Jogador"}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: theme.inkSoft }}>
              {posicaoLabel(player.position)}{player.username ? ` · @${player.username}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className="rc-ovr" style={{ fontSize: 30 }}>{rating.overall}</span>
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: theme.inkSoft }}>OVR</span>
          </div>
        </div>

        <Radar rating={rating} theme={theme} />

        <div className="grid w-full grid-cols-3 gap-1.5">
          {itens.map(i => (
            <div key={i.label} className="rc-stat" style={{ borderColor: `${theme.inkSoft}55` }}>
              <span className="rc-stat-val">{i.valor}</span>
              <span className="rc-stat-lbl" style={{ color: theme.inkSoft }}>{i.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 w-full">
          <div className="mb-1 flex justify-between text-[9px] font-black uppercase tracking-wider" style={{ color: theme.inkSoft }}>
            <span>{theme.label}</span>
            <span>{proximo ? `Rumo ao ${proximo}` : "Raridade máxima"}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: `${theme.inkSoft}40` }}>
            <div className="rc-progress h-full rounded-full" style={{ width: `${Math.round(rating.progresso * 100)}%`, background: theme.ink }} />
          </div>
        </div>
      </div>
      <div className="rc-brand" style={{ color: theme.inkSoft }}>RACHAPP</div>
    </Shell>
  );
}

interface PlayerCardProps extends PlayerCardData {
  className?: string;
  disableTilt?: boolean;
}

export function PlayerCard({ className, disableTilt = false, ...player }: PlayerCardProps) {
  const [flipped, setFlipped] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);
  const rating = calcularRating(player);
  const theme = TIER_THEME[rating.tier];
  const sombra = `drop-shadow(${theme.glow.replace(/^0 /, "0px ")})`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (disableTilt || !el) return;
    const rect = el.getBoundingClientRect();
    const px = Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)));
    const py = Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)));
    el.style.setProperty("--rx", `${py * -14}deg`);
    el.style.setProperty("--ry", `${px * 14}deg`);
    el.style.setProperty("--gx", `${((px + 1) / 2) * 100}%`);
    el.style.setProperty("--gy", `${((py + 1) / 2) * 100}%`);
    el.style.setProperty("--go", "1");
  };

  const resetTilt = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--go", "0");
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="rc-wrapper" style={{ width: CARD_W, height: CARD_H }}>
        <div ref={tiltRef} className="rc-tilt" onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
          <button
            type="button"
            className="rc-flip"
            data-flipped={flipped}
            onClick={() => setFlipped(f => !f)}
            aria-label={flipped ? "Ver frente da carta" : "Ver verso da carta com estatísticas"}
          >
            {/* drop-shadow fica em cada face: filtro no pai achataria o 3D e espelharia o verso */}
            <div className="rc-face" style={{ filter: sombra }}>
              <PlayerCardFront player={player} rating={rating} theme={theme} />
            </div>
            <div className="rc-face rc-face-back" style={{ filter: sombra }}>
              <PlayerCardBack player={player} rating={rating} theme={theme} />
            </div>
          </button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs font-bold text-white/75">
        Toque na carta para {flipped ? "voltar" : "ver as estatísticas"} ↻
      </p>
    </div>
  );
}

/** Carta estática (sem flip) para imagens de compartilhamento */
export function PlayerCardStatic({ face, ...player }: PlayerCardData & { face: "front" | "back" }) {
  const rating = calcularRating(player);
  const theme = TIER_THEME[rating.tier];
  const Face = face === "front" ? PlayerCardFront : PlayerCardBack;
  return (
    <div style={{ width: CARD_W, height: CARD_H, position: "relative" }}>
      <Face player={player} rating={rating} theme={theme} />
    </div>
  );
}
