import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import "./styles/PlayerCardPremium.css";

interface PlayerCardProps {
  name: string;
  username?: string;
  position: string;
  overall: number;
  stats: { matches: number; goals: number; assists: number; awards?: number };
  photo?: string | null;
  className?: string;
  disableTilt?: boolean;
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
    statsBg: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(8,5,30,.97) 30%)",
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
    statsBg: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(40,28,0,.97) 30%)",
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
    statsBg: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(20,20,20,.97) 30%)",
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
    statsBg: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(30,15,0,.97) 30%)",
    ratingColor: "#ffd9a0", labelColor: "#b87333", valueColor: "#ffe4b5",
    positionColor: "#ffd9a0", dividerColor: "rgba(184,115,51,.4)",
    glow: "0 0 20px rgba(200,140,60,.5)",
    typeBadge: "BRONZE", topOverlay: "linear-gradient(180deg,rgba(40,20,0,.3) 0%,transparent 60%)",
    backBg: "linear-gradient(160deg,#3a1e00 0%,#6b4510 60%,#3a1e00 100%)",
    backAccent: "#c8893e", barColor: "#ffd9a0",
  };
}

function StatBar({ label, value, max, color, labelColor }: {
  label: string; value: number; max: number; color: string; labelColor: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="font-black shrink-0 text-right" style={{ fontSize: 15, color, minWidth: 28 }}>{value}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,.1)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}`, transition: "width .7s ease .4s" }} />
      </div>
      <span className="uppercase font-bold shrink-0" style={{ fontSize: 9, color: labelColor, minWidth: 36, letterSpacing: ".05em" }}>{label}</span>
    </div>
  );
}

export function PlayerCard({ name, username, position, overall, stats, photo, className, disableTilt = false }: PlayerCardProps) {
  const [flipped, setFlipped] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);

  let cardType: CardType = "bronze";
  if (overall > 200) cardType = "premium";
  else if (overall > 100) cardType = "gold";
  else if (overall > 50) cardType = "silver";

  const s = getCardConfig(cardType);
  const displayName = name.length > 12 && username ? username : name;
  const maxStat = Math.max(stats.goals, stats.assists, stats.matches, stats.awards ?? 0, 1);
  const statItems = [
    { label: "GOL", value: stats.goals },
    { label: "ASS", value: stats.assists },
    { label: "JOG", value: stats.matches },
    { label: "PRM", value: stats.awards ?? 0 },
  ];

  // Tilt — only active when NOT flipped and not disabled
  useEffect(() => {
    if (!tiltRef.current) return;
    // Reset tilt when flipping
    tiltRef.current.style.transform = "none";
  }, [flipped]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableTilt || flipped || !tiltRef.current) return;
    const rect = tiltRef.current.getBoundingClientRect();
    const px = Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)));
    const py = Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)));
    tiltRef.current.style.transform = `perspective(900px) rotateX(${py * -20}deg) rotateY(${px * 20}deg) scale(1.04)`;
    tiltRef.current.style.setProperty("--glare-x", `${((px + 1) / 2) * 100}%`);
    tiltRef.current.style.setProperty("--glare-y", `${((py + 1) / 2) * 100}%`);
    tiltRef.current.style.setProperty("--glare-opacity", "1");
  };

  const handleMouseLeave = () => {
    if (!tiltRef.current) return;
    tiltRef.current.style.transform = "none";
    tiltRef.current.style.setProperty("--glare-opacity", "0");
  };

  const cardBody = (bg: string, children: React.ReactNode) => (
    <div className="absolute inset-0 rounded-2xl p-[3px]" style={{ background: s.outerBorder, boxShadow: s.glow, borderRadius: 16 }}>
      <div className="relative w-full h-full overflow-hidden" style={{ background: bg, borderRadius: 14 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div
      className={cn("eafc-card-wrapper", className)}
      style={{ width: 240, height: 340, perspective: "1200px" }}
    >
      {/* ── Tilt layer (mouse events here) ── */}
      <div
        ref={tiltRef}
        className="eafc-card"
        style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", willChange: "transform", transition: "transform .25s cubic-bezier(.23,1,.32,1)" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Flip layer (click toggles rotateY 180) ── */}
        <div
          onClick={() => setFlipped(f => !f)}
          style={{
            width: "100%", height: "100%", position: "relative",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform .65s cubic-bezier(.4,.2,.2,1)",
            cursor: "pointer",
          }}
        >
          {/* ════ FRENTE ════ */}
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            {cardBody(s.cardBg, <>
              <div className="absolute inset-0 pointer-events-none" style={{ background: s.topOverlay }} />
              {photo ? (
                // Foto cobre a carta inteira
                <div className="absolute inset-0 pointer-events-none"
                  style={{ backgroundImage: `url(${photo})`, backgroundSize: "110%", backgroundPosition: "center top" }} />
              ) : (
                // Fallback: inicial centralizada
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 90 }}>
                  <span className="font-black" style={{ fontSize: 72, color: s.ratingColor, opacity: 0.25 }}>{displayName.charAt(0)}</span>
                </div>
              )}
              <div className="eafc-glare" />
              {/* Rating + Position */}
              <div className="absolute top-4 left-4 z-20 flex flex-col items-center leading-none">
                <span className="font-black leading-none" style={{ fontSize: 38, color: s.ratingColor, textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>{overall}</span>
                {/* <span className="font-black uppercase tracking-widest mt-0.5" style={{ fontSize: 11, color: s.positionColor, letterSpacing: ".15em" }}>{position}</span> */}
                <div className="w-7 mt-2" style={{ height: 1.5, background: s.dividerColor }} />
              </div>
              {/* Type badge */}
              <div className="absolute top-4 right-4 z-20">
                <span className="font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-[9px]"
                  style={{ color: s.ratingColor, border: `1px solid ${s.dividerColor}`, background: "rgba(0,0,0,.35)" }}>
                  {s.typeBadge}
                </span>
              </div>
              {/* Name + Stats bottom */}
              <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center"
                style={{ background: s.statsBg, paddingTop: 24, paddingBottom: 14, paddingLeft: 12, paddingRight: 12 }}>
                <h2 className="font-black uppercase truncate w-full text-center mb-2 tracking-wide"
                  style={{ fontSize: 16, color: s.ratingColor, textShadow: "0 1px 6px rgba(0,0,0,.7)", maxWidth: "90%" }}>
                  {displayName}
                </h2>
                <div className="w-full mb-3" style={{ height: 1, background: s.dividerColor }} />
                <div className="flex items-center justify-around w-full">
                  {statItems.map((item, i) => (
                    <React.Fragment key={item.label}>
                      <div className="flex flex-col items-center">
                        <span className="font-black leading-none" style={{ fontSize: 18, color: s.valueColor }}>{item.value}</span>
                        <span className="uppercase font-bold mt-0.5" style={{ fontSize: 9, color: s.labelColor, letterSpacing: ".05em" }}>{item.label}</span>
                      </div>
                      {i < statItems.length - 1 && <div style={{ width: 1, height: 28, background: s.dividerColor, borderRadius: 1 }} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              {/* Hint */}
              <div className="absolute bottom-2 right-3 z-30 opacity-40" style={{ fontSize: 8, color: s.labelColor }}></div>
            </>)}
          </div>

          {/* ════ VERSO ════ */}
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            {cardBody(s.backBg, <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: `1px solid ${s.dividerColor}`, background: "rgba(0,0,0,.3)" }}>
                <div className="flex flex-col leading-none">
                  <span className="font-black uppercase truncate" style={{ fontSize: 14, color: s.ratingColor, maxWidth: 130 }}>{displayName}</span>
                  {/* <span className="uppercase font-bold mt-0.5" style={{ fontSize: 9, color: s.labelColor, letterSpacing: ".1em" }}>{position} · {s.typeBadge}</span> */}
                </div>
                <div className="flex flex-col items-center leading-none">
                  <span className="font-black" style={{ fontSize: 30, color: s.ratingColor, textShadow: `0 0 12px ${s.backAccent}` }}>{overall}</span>
                  <span className="uppercase font-bold" style={{ fontSize: 8, color: s.labelColor, letterSpacing: ".1em" }}>pontos</span>
                </div>
              </div>
              {/* Avatar */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${s.dividerColor}` }}>
                <Avatar className="shrink-0" style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${s.backAccent}` }}>
                  <AvatarImage src={photo || undefined} className="object-cover object-top" />
                  <AvatarFallback className="font-black text-xl" style={{ background: "rgba(0,0,0,.4)", color: s.ratingColor, borderRadius: "50%" }}>
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <span className="font-extrabold truncate" style={{ fontSize: 12, color: s.valueColor, maxWidth: 140 }}>{name}</span>
                  {username && name !== username && (
                    <span className="font-bold" style={{ fontSize: 10, color: s.labelColor }}>@{username}</span>
                  )}
                  <div className="mt-1 px-2 py-0.5 rounded-full inline-flex self-start"
                    style={{ background: `${s.backAccent}22`, border: `1px solid ${s.dividerColor}` }}>
                    <span className="font-black uppercase" style={{ fontSize: 8, color: s.backAccent, letterSpacing: ".1em" }}>
                      {cardType === "premium" ? "⭐ Ícone" : cardType === "gold" ? "🥇 Ouro" : cardType === "silver" ? "🥈 Prata" : "🥉 Bronze"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Stat bars */}
              <div className="flex flex-col gap-1.5 px-4 py-3">
                <span className="uppercase font-black" style={{ fontSize: 9, color: s.labelColor, letterSpacing: ".15em" }}>Estatísticas</span>
                <StatBar label="Gols" value={stats.goals} max={maxStat} color={s.barColor} labelColor={s.labelColor} />
                <StatBar label="Assistências" value={stats.assists} max={maxStat} color={s.barColor} labelColor={s.labelColor} />
                <StatBar label="Jogos" value={stats.matches} max={maxStat} color={s.barColor} labelColor={s.labelColor} />
                <StatBar label="Prêmios" value={stats.awards ?? 0} max={maxStat} color={s.barColor} labelColor={s.labelColor} />
              </div>
              {/* Ratios */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-4"
                style={{ borderTop: `1px solid ${s.dividerColor}`, background: "rgba(0,0,0,.25)" }}>
                {[
                  { label: "Gols/Jogo", value: stats.matches > 0 ? (stats.goals / stats.matches).toFixed(1) : "0.0" },
                  { label: "Ass./Jogo", value: stats.matches > 0 ? (stats.assists / stats.matches).toFixed(1) : "0.0" },
                  { label: "Contribuições", value: stats.goals + stats.assists },
                  { label: "Pts/Jogo", value: stats.matches > 0 ? (overall / stats.matches).toFixed(1) : "0.0" },
                ].map(r => (
                  <div key={r.label} className="flex items-baseline gap-1 ml-4">
                    <span className="font-black" style={{ fontSize: 13, color: s.valueColor }}>{r.value}</span>
                    <span className="font-bold" style={{ fontSize: 8, color: s.labelColor, letterSpacing: ".04em" }}>{r.label}</span>
                  </div>
                ))}
              </div>
              {/* Hint */}
              <div className="absolute bottom-2 right-3 opacity-40" style={{ fontSize: 8, color: s.labelColor }}></div>
            </>)}
          </div>

        </div>{/* /flip layer */}
      </div>{/* /tilt layer */}
    </div>
  );
}
