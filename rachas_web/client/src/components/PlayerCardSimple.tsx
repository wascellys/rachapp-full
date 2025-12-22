import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import "./styles/PlayerCard.css";

function useCardTilt() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);

  const updateTransform = (x: number, y: number) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -14;
    const rotateY = ((x - centerX) / centerX) * 14;

    ref.current.style.transform = `
      perspective(900px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
    `;

    ref.current.style.setProperty("--mx", `${x}px`);
    ref.current.style.setProperty("--my", `${y}px`);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    ref.current?.classList.add("active");
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateTransform(x, y);
  };

  const reset = () => {
    isDragging.current = false;
    if (!ref.current) return;

    ref.current.style.transform =
      "perspective(900px) rotateX(0deg) rotateY(0deg)";
  };

  return {
    ref,
    onMouseDown,
    onMouseMove,
    onMouseUp: reset,
    onMouseLeave: reset,
  };
}

/* =========================
   Componente PlayerCard
========================= */

interface PlayerCardProps {
  name: string;
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
}

export function PlayerCardSimple({
  name,
  position,
  overall,
  stats,
  photo,
  className,
}: PlayerCardProps) {
  let cardType: "bronze" | "silver" | "gold" | "premium" = "bronze";

  if (overall > 200) cardType = "premium";
  else if (overall > 100) cardType = "gold";
  else if (overall > 50) cardType = "silver";

  const styles = {
    bronze: {
      bg: "bg-gradient-to-b from-[#e6be8a] via-[#a57c52] to-[#583e23]",
      border: "bg-[#583e23]",
      text: "text-[#3e2723]",
      accent: "text-[#583e23]",
    },
    silver: {
      bg: "bg-gradient-to-b from-[#e3e3e3] via-[#c0c0c0] to-[#8a8a8a]",
      border: "bg-[#686868]",
      text: "text-[#2b2b2b]",
      accent: "text-[#4a4a4a]",
    },
    gold: {
      bg: "bg-gradient-to-b from-[#f9e68d] via-[#eec130] to-[#b8860b]",
      border: "bg-[#b8860b]",
      text: "text-[#5c4033]",
      accent: "text-[#8b4513]",
    },
    premium: {
      bg: "bg-gradient-to-b from-[#111] via-black to-[#111]",
      border: "bg-gradient-to-b from-[#ffd700] via-[#ffec8b] to-[#bfa100]",
      text: "text-[#ffd700]",
      accent: "text-[#ffdf70]",
    },
  };

  const style = styles[cardType];

  const { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave } =
    useCardTilt();

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative w-62 h-90 mx-auto card-3d cursor-grab active:cursor-grabbing select-none",
        className
      )}
    >
      {/* BORDA */}
      <div
        className={cn(
          "absolute inset-0 p-[6px]",
          style.border,
          cardType === "premium" && "shadow-[0_0_25px_rgba(255,215,0,0.45)]"
        )}
      >
        {/* CARTA */}
        <div className={cn("w-full h-full overflow-hidden p-4", style.bg)}>
          {/* GLOW DINÂMICO */}
          <div
            className={cn("card-glow", cardType === "premium" && "opacity-100")}
          />

          {/* TOPO */}
          <div>
            <div className="w-full items-center">
              <div className="w-50 h-50">
                <Avatar className="w-full h-full">
                  <AvatarImage src={photo || undefined} />
                  <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          {/* NOME */}
          <div className="mt-2 mb-2 text-center relative z-10">
            <h2
              className={cn(
                "text-2xl font-bold uppercase truncate",
                style.text
              )}
            >
              {name}
            </h2>
          </div>

          <div className="mt-2 mb-2 text-center relative z-10">
            <h2
              className={cn("text-2 font-bold uppercase truncate", style.text)}
            >
              {overall} PTS
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
