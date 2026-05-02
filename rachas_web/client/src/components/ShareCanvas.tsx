import React, { forwardRef } from "react";
import { PlayerCardFront, PlayerCardBack } from "./PlayerCardStatic";

interface ShareCanvasProps {
  player: any;
  rachaName?: string;
}

export const ShareCanvas = forwardRef<HTMLDivElement, ShareCanvasProps>(({ player, rachaName }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: 560,
        height: 490,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 24,
        overflow: "hidden",
        fontFamily: "'Nunito', 'Segoe UI', sans-serif",
        padding: "16px 24px 20px",
        boxSizing: "border-box",
      }}
    >
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)" }} />
      {/* Radial glow */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(74,222,128,.14) 0%, transparent 65%)" }} />

      {/* Racha name header */}
      {rachaName && (
        <div style={{
          position: "relative", zIndex: 10,
          marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ width: 24, height: 2, background: "rgba(74,222,128,.5)", borderRadius: 1 }} />
          <span style={{
            fontWeight: 900, fontSize: 13, color: "rgba(74,222,128,.85)",
            letterSpacing: ".12em", textTransform: "uppercase",
          }}>
            {rachaName}
          </span>
          <div style={{ width: 24, height: 2, background: "rgba(74,222,128,.5)", borderRadius: 1 }} />
        </div>
      )}

      {/* Cards side by side */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        gap: 20,
      }}>
        <PlayerCardFront {...player} />

        {/* Divider */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ width: 1, height: 60, background: "rgba(255,255,255,.08)", borderRadius: 1 }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.2)" }}>⟷</span>
          <div style={{ width: 1, height: 60, background: "rgba(255,255,255,.08)", borderRadius: 1 }} />
        </div>

        <PlayerCardBack {...player} />
      </div>

      {/* Watermark */}
      <div style={{
        position: "absolute", bottom: 8, right: 14,
        fontWeight: 900, fontSize: 10,
        color: "rgba(255,255,255,.18)", letterSpacing: ".08em",
      }}>
        RachApp
      </div>
    </div>
  );
});
