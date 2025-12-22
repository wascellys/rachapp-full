import React, { forwardRef } from "react";
import { PlayerCard } from "./PlayerCard";

export const ShareCanvas = forwardRef<HTMLDivElement, any>(
  ({ player }, ref) => {
    return (
      <div
        ref={ref}
        className="relative w-[540px] h-[960px] flex items-center justify-center overflow-hidden rounded-2xl"
      >
        {/* FUNDO */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0, 255, 34, 0.35),transparent_65%)]" />

        {/* CARD */}
        <div className="relative z-10 scale-[1.4]">
          <PlayerCard {...player} disableTilt />
        </div>
      </div>
    );
  }
);
