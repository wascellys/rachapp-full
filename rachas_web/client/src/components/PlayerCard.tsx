import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import "./styles/PlayerCardPremium.css";

/* =========================
   Tipagens
========================= */
interface TiltState {
  rotateX: number;
  rotateY: number;
  scale: number;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface PlayerCardProps {
  name: string;
  username?: string;
  position: string;
  overall: number;
  stats: {
    matches: number;
    goals: number;
    assists: number;
    awards?: number;
  };
  photo?: string | null;
  className?: string;
  disableTilt?: boolean;
}

/* =========================
   Hook de Tilt 3D (Seguro)
========================= */
function useCardTilt(disabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltState>({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  });

  const config = {
    max: 25,
    scale: 1.05,
  };

  const calculateRGBColor = (px: number, py: number): RGBColor => {
    const r = Math.round(((px + 1) / 2) * 255);
    const g = Math.round((((px + py) / 2 + 1) / 2) * 255);
    const b = Math.round(((py + 1) / 2) * 255);
    return { r, g, b };
  };

  const onMouseMove = disabled
    ? undefined
    : (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const px = Math.max(-1, Math.min(1, x / (rect.width / 2)));
        const py = Math.max(-1, Math.min(1, y / (rect.height / 2)));

        setTilt({
          rotateX: py * -config.max,
          rotateY: px * config.max,
          scale: config.scale,
        });

        const rgb = calculateRGBColor(px, py);

        ref.current.style.setProperty("--mx", `${((px + 1) / 2) * 100}%`);
        ref.current.style.setProperty("--my", `${((py + 1) / 2) * 100}%`);
        ref.current.style.setProperty("--glow-opacity", "1");
        ref.current.style.setProperty(
          "--rgb-glow",
          `${rgb.r}, ${rgb.g}, ${rgb.b}`
        );
      };

  const onMouseLeave = disabled
    ? undefined
    : () => {
        setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
        ref.current?.style.setProperty("--glow-opacity", "0");
      };

  const handleTouchMove = disabled
    ? undefined
    : (e: React.TouchEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const touch = e.touches[0];
        const rect = ref.current.getBoundingClientRect();

        const x = touch.clientX - rect.left - rect.width / 2;
        const y = touch.clientY - rect.top - rect.height / 2;

        const px = Math.max(-1, Math.min(1, x / (rect.width / 2)));
        const py = Math.max(-1, Math.min(1, y / (rect.height / 2)));

        setTilt({
          rotateX: py * -25,
          rotateY: px * 25,
          scale: 1.05,
        });
      };

  useEffect(() => {
    if (!ref.current) return;

    if (disabled) {
      ref.current.style.transform = "none";
      ref.current.style.setProperty("--glow-opacity", "0");
      return;
    }

    ref.current.style.transform = `
      perspective(900px)
      rotateX(${tilt.rotateX}deg)
      rotateY(${tilt.rotateY}deg)
      scale(${tilt.scale})
    `;
  }, [tilt, disabled]);

  return { ref, onMouseMove, onMouseLeave, handleTouchMove };
}

/* =========================
   PlayerCard
========================= */
export function PlayerCard({
  name,
  username,
  position,
  overall,
  stats,
  photo,
  className,
  disableTilt = false,
}: PlayerCardProps) {
  let cardType: "bronze" | "silver" | "gold" | "premium" = "bronze";

  if (overall > 200) cardType = "premium";
  else if (overall > 100) cardType = "gold";
  else if (overall > 50) cardType = "silver";

  const styles = {
    bronze: {
      bg: "bg-gradient-to-b from-[#895E1A] to-[#9C7A3C]",
      border: "bg-[#804A00]",
      text: "text-[black]",
      accent: "text-[#583e23]",
    },
    silver: {
      bg: "bg-gradient-to-b from-[#70706F] via-[#c0c0c0] to-[#8a8a8a]",
      border: "bg-[#686868]",
      text: "text-[#2b2b2b]",
      accent: "text-[#4a4a4a]",
    },
    gold: {
      bg: "bg-gradient-to-b from-[#D4AF37] to-[#b8860b]",
      border: "bg-[#996515]",
      text: "text-[black]",
      accent: "text-[black]",
    },
    premium: {
      bg: "bg-gradient-to-b from-[#134EA0] via-[#1E13A0] to-[#6513A0]",
      border: "bg-gradient-to-b from-[#0ebeff] via-[#7987dd] to-[#ff42b3]",
      text: "text-white",
      accent: "text-white",
    },
  };

  const style = styles[cardType];
  const { ref, onMouseMove, onMouseLeave, handleTouchMove } =
    useCardTilt(disableTilt);

  const displayName = name.length > 10 && username ? username : name;


  console.log(name, username, displayName);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={onMouseLeave}
      className={cn(
        "relative w-62 h-90 mx-auto card-3d select-none",
        className
      )}
    >
      {/* BORDA */}
      <div
        className={cn(
          "absolute inset-0 p-[6px] rounded-lg",
          style.border,
          cardType === "premium" && "shadow-[0_0_25px_rgba(120,215,255,0.8)]"
        )}
      >
        {/* CARTA */}
        <div
          className={cn(
            "relative w-full h-full rounded-lg overflow-hidden flex flex-col p-4",
            style.bg
          )}
        >
          {/* FUNDO COM IMAGEM (TOP) */}
          <div
            className="absolute top-0 left-0 w-full h-[35%]"
            style={{
              backgroundImage: photo ? `url(${photo})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              filter: "blur(18px) brightness(0.7)",
              transform: "scale(1.15)",
            }}
          />
          <div className="absolute top-0 left-0 w-full h-[57%] bg-black/35" />

          {/* CONTEÚDO SUPERIOR */}
          <div className="relative z-10">
            <div className="flex">
              <div className="flex flex-col w-1/3 pt-4">
                <span className={cn("text-4xl font-bold", style.text)}>
                  {overall}
                </span>
                <span className={cn("text-lg font-semibold", style.text)}>
                  PTS
                </span>
                <div
                  className={cn(
                    "w-10 h-0.5 mt-2",
                    style.accent.replace("text-", "bg-")
                  )}
                />
              </div>

              <div className="w-3/4 flex items-end justify-center">
                <Avatar className="w-45 h-45 rounded-full">
                  <AvatarImage
                    src={photo || undefined}
                    className="object-cover object-top drop-shadow-lg"
                  />
                  <AvatarFallback className="text-4xl font-bold">
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          {/* GLASS (NOME + STATS) */}
          <div className="relative z-10 mt-0">
            <div className="absolute bg-white/10 backdrop-blur-md rounded-lg border border-white/20" />
            <div className="relative p-3">
              {/* NOME */}
              <div className="mb-2 text-center">
                <h2
                  className={cn(
                    "text-2 font-bold uppercase truncate",
                    style.text
                  )}
                >
                  {displayName}
                </h2>
                <div
                  className={cn(
                    "h-0.5 w-full mt-1 opacity-40",
                    style.accent.replace("text-", "bg-")
                  )}
                />
              </div>

              {/* STATS */}
              <div className="grid grid-cols-2 gap-y-1">
                {[
                  ["GOLS", stats.goals],
                  ["ASSISTÊNCIAS", stats.assists],
                  ["PRÊMIOS", stats.awards || 0],
                  ["JOGOS", stats.matches],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center">
                    <span className={cn("font-bold", style.text)}>{value}</span>
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase ml-2",
                        style.accent
                      )}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GLOW */}
          <div
            className={cn("card-glow", cardType === "premium" && "opacity-100")}
          />
        </div>
      </div>
    </div>
  );
}
