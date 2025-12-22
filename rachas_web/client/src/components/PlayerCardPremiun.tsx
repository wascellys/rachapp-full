import React, { useRef, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import "./styles/PlayerCardPremium.css";

interface PlayerCardPremiumProps {
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

interface TiltState {
  rotateX: number;
  rotateY: number;
  scale: number;
}

export function PlayerCardPremium({
  name,
  position,
  overall,
  stats,
  photo,
  className,
}: PlayerCardPremiumProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [tiltState, setTiltState] = useState<TiltState>({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  });

  // Configurações do efeito
  const config = {
    max: 25, // Ângulo máximo de rotação
    scale: 1.05, // Escala ao fazer hover
    speed: 100, // Velocidade de transição em ms
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!innerRef.current || !cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();

    // Calcula a posição do mouse relativa ao centro do card
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Calcula a porcentagem de movimento (0 a 1)
    const px = x / (rect.width / 2);
    const py = y / (rect.height / 2);

    // Limita os valores entre -1 e 1
    const limitedPx = Math.max(-1, Math.min(1, px));
    const limitedPy = Math.max(-1, Math.min(1, py));

    // Calcula a rotação com suavidade
    const rotateX = limitedPy * config.max * -1;
    const rotateY = limitedPx * config.max;

    // Atualiza o estado
    setTiltState({
      rotateX,
      rotateY,
      scale: config.scale,
    });

    // Atualiza as CSS variables para o glare
    const glareX = ((limitedPx + 1) / 2) * 100;
    const glareY = ((limitedPy + 1) / 2) * 100;

    innerRef.current.style.setProperty("--glare-x", `${glareX}%`);
    innerRef.current.style.setProperty("--glare-y", `${glareY}%`);
    innerRef.current.style.setProperty("--glare-opacity", "1");
  };

  const onMouseLeave = () => {
    // Reset suave para a posição inicial
    setTiltState({
      rotateX: 0,
      rotateY: 0,
      scale: 1,
    });

    if (innerRef.current) {
      innerRef.current.style.setProperty("--glare-opacity", "0");
    }
  };

  // Aplica as transformações ao elemento inner
  useEffect(() => {
    if (!innerRef.current) return;

    const transform = `
      perspective(1200px)
      rotateX(${tiltState.rotateX}deg)
      rotateY(${tiltState.rotateY}deg)
      scale(${tiltState.scale})
    `;

    innerRef.current.style.transform = transform;
  }, [tiltState]);

  return (
    <div
      ref={cardRef}
      className={cn("premium-card", className)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onDragStart={e => e.preventDefault()}
    >
      <div></div>
      <div ref={innerRef} className="premium-card-inner">
        {/* FUNDO */}
        <div
          className="premium-layer bg-gradient-to-b from-[#111] via-black to-[#111]"
          data-depth="0"
        />

        {/* GLARE - Brilho dinâmico */}
        <div className="premium-layer premium-glare" data-depth="20" />

        {/* OVERALL */}
        <div className="p-4 text-[#ffd700]" data-depth="40">
          <div className="text-4xl font-bold">{overall}</div>
          <div className="text-sm font-semibold">PTS</div>
        </div>

        {/* FOTO */}
        <div
          className="premium-layer flex justify-center pt-10"
          data-depth="60"
        >
          <div className="w-45 h-45">
            <Avatar className="w-full h-full bg-transparent">
              <AvatarImage
                src={photo || undefined}
                className="object-cover object-top"
              />
              <AvatarFallback className="bg-transparent text-4xl text-white/40">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* NOME */}
        <div
          className="premium-layer flex justify-center items-end pb-30 text-[#ffd700]"
          data-depth="80"
        >
          <h2 className="text-2xl font-bold uppercase truncate">{name}</h2>
        </div>

        {/* STATS */}
        <div
          className="premium-layer grid grid-cols-2 gap-x-12 px-2 mt-20 text-[#ffd700]"
          data-depth="100"
        >
          {[
            ["JOGOS", stats.matches],
            ["GOLS", stats.goals],
            ["ASSISTENCIAS", stats.assists],
            ["PREMIOS", stats.awards || 0],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col items-center pt-45">
              <span className="font-bold">{value}</span>
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
