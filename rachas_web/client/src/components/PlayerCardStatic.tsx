/**
 * PlayerCardStatic.tsx
 *
 * Versões estáticas (sem 3D/tilt/flip) da frente e do verso da carta.
 * Usadas pelo ShareCanvas para gerar a imagem de compartilhamento.
 */
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CardProps {
  name: string;
  username?: string;
  position: string;
  overall: number;
  stats: { matches: number; goals: number; assists: number; awards?: number };
  photo?: string | null;
}

type CardType = "bronze" | "silver" | "gold" | "premium";

interface CardStyle {
  cardBg: string; outerBorder: string; statsBg: string;
  ratingColor: string; labelColor: string; valueColor: string;
  positionColor: string; dividerColor: string; glow: string;
  typeBadge: string; topOverlay: string; backBg: string;
  backAccent: string; barColor: string;
}

function getCardConfig(t: CardType): CardStyle {
  if (t === "premium") return {
    cardBg: "linear-gradient(160deg,#0d1b4b 0%,#1a0a3d 40%,#3b0764 100%)",
    outerBorder: "linear-gradient(135deg,#00d4ff,#a855f7,#ec4899,#00d4ff)",
    statsBg: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(8,5,30,.99) 25%)",
    ratingColor: "#c4b5fd", labelColor: "#a78bfa", valueColor: "#e9d5ff",
    positionColor: "#c4b5fd", dividerColor: "rgba(167,139,250,.4)",
    glow: "0 0 40px rgba(168,85,247,.7),0 0 80px rgba(0,212,255,.3)",
    typeBadge: "ICON", topOverlay: "linear-gradient(180deg,rgba(13,27,75,.3) 0%,transparent 60%)",
    backBg: "linear-gradient(160deg,#0d1b4b 0%,#1a0a3d 60%,#3b0764 100%)",
    backAccent: "#a855f7", barColor: "#c4b5fd",
  };
  if (t === "gold") return {
    cardBg: "linear-gradient(160deg,#7a5800 0%,#c49a00 45%,#7a5800 100%)",
    outerBorder: "linear-gradient(135deg,#ffe066,#ffd700,#b8860b,#ffd700)",
    statsBg: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(40,28,0,.99) 25%)",
    ratingColor: "#fff8dc", labelColor: "#d4a017", valueColor: "#fffacd",
    positionColor: "#fff8dc", dividerColor: "rgba(212,175,55,.5)",
    glow: "0 0 30px rgba(255,215,0,.6),0 0 60px rgba(184,134,11,.3)",
    typeBadge: "GOLD", topOverlay: "linear-gradient(180deg,rgba(60,40,0,.3) 0%,transparent 60%)",
    backBg: "linear-gradient(160deg,#5a3e00 0%,#9a7800 60%,#5a3e00 100%)",
    backAccent: "#ffd700", barColor: "#ffe066",
  };
  if (t === "silver") return {
    cardBg: "linear-gradient(160deg,#3a3a3a 0%,#8a8a8a 45%,#3a3a3a 100%)",
    outerBorder: "linear-gradient(135deg,#e0e0e0,#b0b0b0,#606060,#c0c0c0)",
    statsBg: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(20,20,20,.99) 25%)",
    ratingColor: "#f0f0f0", labelColor: "#a0a0a0", valueColor: "#e8e8e8",
    positionColor: "#f0f0f0", dividerColor: "rgba(192,192,192,.4)",
    glow: "0 0 25px rgba(200,200,200,.5)",
    typeBadge: "SILVER", topOverlay: "linear-gradient(180deg,rgba(30,30,30,.3) 0%,transparent 60%)",
    backBg: "linear-gradient(160deg,#2a2a2a 0%,#6a6a6a 60%,#2a2a2a 100%)",
    backAccent: "#c0c0c0", barColor: "#e0e0e0",
  };
  return {
    cardBg: "linear-gradient(160deg,#4a2800 0%,#8B5E1A 45%,#4a2800 100%)",
    outerBorder: "linear-gradient(135deg,#d4a96a,#c8893e,#7a4a10,#c8893e)",
    statsBg: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(30,15,0,.99) 25%)",
    ratingColor: "#ffd9a0", labelColor: "#b87333", valueColor: "#ffe4b5",
    positionColor: "#ffd9a0", dividerColor: "rgba(184,115,51,.4)",
    glow: "0 0 20px rgba(200,140,60,.5)",
    typeBadge: "BRONZE", topOverlay: "linear-gradient(180deg,rgba(40,20,0,.3) 0%,transparent 60%)",
    backBg: "linear-gradient(160deg,#3a1e00 0%,#6b4510 60%,#3a1e00 100%)",
    backAccent: "#c8893e", barColor: "#ffd9a0",
  };
}

function StatRow({ label, value, max, color, labelColor }: {
  label: string; value: number; max: number; color: string; labelColor: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
      <span style={{ fontWeight: 900, fontSize: 14, color, minWidth: 26, textAlign: "right" }}>{value}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,.1)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color, boxShadow: `0 0 5px ${color}` }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 8, color: labelColor, minWidth: 38, letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

/** Frente estática da carta — mesmo visual do EA FC card */
export function PlayerCardFront({ name, username, position, overall, stats, photo }: CardProps) {
  let cardType: CardType = "bronze";
  if (overall > 200) cardType = "premium";
  else if (overall > 100) cardType = "gold";
  else if (overall > 50) cardType = "silver";

  const s = getCardConfig(cardType);
  const displayName = name.length > 12 && username ? username : name;
  const statItems = [
    { label: "GOL", value: stats.goals },
    { label: "ASS", value: stats.assists },
    { label: "JOG", value: stats.matches },
    { label: "PRM", value: stats.awards ?? 0 },
  ];

  return (
    <div style={{ width: 220, height: 310, position: "relative", borderRadius: 16, padding: 3, background: s.outerBorder, boxShadow: s.glow, flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 13, overflow: "hidden", position: "relative", background: s.cardBg }}>
        {/* Foto cobre a carta inteira */}
        {photo ? (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center top",
          }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 80, pointerEvents: "none" }}>
            <span style={{ fontWeight: 900, fontSize: 60, color: s.ratingColor, opacity: 0.2 }}>{displayName.charAt(0)}</span>
          </div>
        )}
        {/* Rating */}
        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
          <span style={{ fontWeight: 900, fontSize: 34, color: s.ratingColor, textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>{overall}</span>
          <span style={{ fontWeight: 900, fontSize: 10, color: s.positionColor, letterSpacing: ".15em", textTransform: "uppercase", marginTop: 2 }}>{position}</span>
          <div style={{ width: 24, height: 1.5, background: s.dividerColor, marginTop: 6 }} />
        </div>
        {/* Type badge */}
        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 20 }}>
          <span style={{ fontWeight: 900, fontSize: 8, color: s.ratingColor, border: `1px solid ${s.dividerColor}`, background: "rgba(0,0,0,.35)", padding: "2px 7px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".1em" }}>
            {s.typeBadge}
          </span>
        </div>
        {/* Name + stats panel */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, background: s.statsBg, paddingTop: 20, paddingBottom: 12, paddingLeft: 10, paddingRight: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h2 style={{ fontWeight: 900, fontSize: 14, color: s.ratingColor, textShadow: "0 1px 6px rgba(0,0,0,.7)", textTransform: "uppercase", textAlign: "center", letterSpacing: ".05em", margin: 0, marginBottom: 6, maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </h2>
          <div style={{ width: "100%", height: 1, background: s.dividerColor, marginBottom: 8 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", width: "100%" }}>
            {statItems.map((item, i) => (
              <React.Fragment key={item.label}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontWeight: 900, fontSize: 16, color: s.valueColor, lineHeight: 1 }}>{item.value}</span>
                  <span style={{ fontWeight: 700, fontSize: 8, color: s.labelColor, letterSpacing: ".05em", textTransform: "uppercase", marginTop: 2 }}>{item.label}</span>
                </div>
                {i < statItems.length - 1 && <div style={{ width: 1, height: 24, background: s.dividerColor, borderRadius: 1 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Verso estático da carta — estatísticas detalhadas */
export function PlayerCardBack({ name, username, position, overall, stats, photo }: CardProps) {
  let cardType: CardType = "bronze";
  if (overall > 200) cardType = "premium";
  else if (overall > 100) cardType = "gold";
  else if (overall > 50) cardType = "silver";

  const s = getCardConfig(cardType);
  const displayName = name.length > 12 && username ? username : name;
  const maxStat = Math.max(stats.goals, stats.assists, stats.matches, stats.awards ?? 0, 1);
  const tierLabel = cardType === "premium" ? "⭐ Ícone" : cardType === "gold" ? "🥇 Ouro" : cardType === "silver" ? "🥈 Prata" : "🥉 Bronze";

  return (
    <div style={{ width: 220, height: 370, position: "relative", borderRadius: 16, padding: 3, background: s.outerBorder, boxShadow: s.glow, flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 13, overflow: "hidden", background: s.backBg, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${s.dividerColor}`, background: "rgba(0,0,0,.3)", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, color: s.ratingColor, textTransform: "uppercase", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
            <div style={{ fontWeight: 700, fontSize: 8, color: s.labelColor, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>{position} · {s.typeBadge}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 26, color: s.ratingColor, lineHeight: 1, textShadow: `0 0 12px ${s.backAccent}` }}>{overall}</div>
            <div style={{ fontWeight: 700, fontSize: 7, color: s.labelColor, letterSpacing: ".1em", textTransform: "uppercase" }}>pontos</div>
          </div>
        </div>
        {/* Avatar row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderBottom: `1px solid ${s.dividerColor}`, flexShrink: 0 }}>
          <Avatar style={{ width: 42, height: 42, borderRadius: "50%", border: `2px solid ${s.backAccent}`, flexShrink: 0 }}>
            <AvatarImage src={photo || undefined} className="object-cover object-top" />
            <AvatarFallback style={{ background: "rgba(0,0,0,.4)", color: s.ratingColor, fontWeight: 900, fontSize: 16, borderRadius: "50%" }}>
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div style={{ fontWeight: 800, fontSize: 11, color: s.valueColor, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            {username && name !== username && (
              <div style={{ fontWeight: 700, fontSize: 9, color: s.labelColor }}>@{username}</div>
            )}
            <div style={{ marginTop: 4, padding: "1px 7px", borderRadius: 99, border: `1px solid ${s.dividerColor}`, background: `${s.backAccent}22`, display: "inline-block" }}>
              <span style={{ fontWeight: 900, fontSize: 7.5, color: s.backAccent, letterSpacing: ".1em", textTransform: "uppercase" }}>{tierLabel}</span>
            </div>
          </div>
        </div>
        {/* Stat bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 8, color: s.labelColor, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 2 }}>Estatísticas</div>
          <StatRow label="Gols" value={stats.goals} max={maxStat} color={s.barColor} labelColor={s.labelColor} />
          <StatRow label="Assistências" value={stats.assists} max={maxStat} color={s.barColor} labelColor={s.labelColor} />
          <StatRow label="Jogos" value={stats.matches} max={maxStat} color={s.barColor} labelColor={s.labelColor} />
          <StatRow label="Prêmios" value={stats.awards ?? 0} max={maxStat} color={s.barColor} labelColor={s.labelColor} />
        </div>
        {/* Ratios */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 6px", padding: "8px 8px 10px", borderTop: `1px solid ${s.dividerColor}`, background: "rgba(0,0,0,.25)", flexShrink: 0 }}>
          {[
            { label: "Gols/Jogo", value: stats.matches > 0 ? (stats.goals / stats.matches).toFixed(1) : "0.0" },
            { label: "Ass./Jogo", value: stats.matches > 0 ? (stats.assists / stats.matches).toFixed(1) : "0.0" },
            { label: "Contribuições", value: stats.goals + stats.assists },
            { label: "Pts/Jogo", value: stats.matches > 0 ? (overall / stats.matches).toFixed(1) : "0.0" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontWeight: 900, fontSize: 12, color: s.valueColor }}>{r.value}</span>
              <span style={{ fontWeight: 700, fontSize: 7.5, color: s.labelColor, letterSpacing: ".04em" }}>{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
