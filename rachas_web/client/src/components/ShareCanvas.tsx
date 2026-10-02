import { forwardRef } from "react";
import { PlayerCardStatic } from "./PlayerCard";
import type { PlayerCardData } from "@/lib/playerRating";

interface ShareCanvasProps {
  player: PlayerCardData;
  rachaName?: string;
}

/** Imagem de compartilhamento: frente + verso lado a lado */
export const ShareCanvas = forwardRef<HTMLDivElement, ShareCanvasProps>(({ player, rachaName }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: 640,
        height: 520,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "'Nunito', 'Segoe UI', sans-serif",
        boxSizing: "border-box",
        background: "radial-gradient(ellipse at 50% 40%, #12351c 0%, #07130a 55%, #020604 100%)",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, opacity: 0.08,
        background: "repeating-linear-gradient(90deg, #fff 0 2px, transparent 2px 80px)",
      }} />

      <div style={{ position: "relative", zIndex: 1, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 2, background: "#4ade80", borderRadius: 1 }} />
        <span style={{ fontWeight: 900, fontSize: 14, color: "#bbf7d0", letterSpacing: ".18em", textTransform: "uppercase" }}>
          {rachaName || "RachApp"}
        </span>
        <div style={{ width: 28, height: 2, background: "#4ade80", borderRadius: 1 }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 28 }}>
        <PlayerCardStatic face="front" {...player} />
        <PlayerCardStatic face="back" {...player} />
      </div>

      <div style={{
        position: "absolute", bottom: 10, right: 16, fontWeight: 900, fontSize: 11,
        color: "rgba(255,255,255,.35)", letterSpacing: ".12em",
      }}>
        RACHAPP
      </div>
    </div>
  );
});
ShareCanvas.displayName = "ShareCanvas";
