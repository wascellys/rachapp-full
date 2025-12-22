import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import * as htmlToImage from "html-to-image";
import { PlayerCard } from "./PlayerCard";
import { ShareCanvas } from "./ShareCanvas";

export function PlayerCardModal({ children, player }) {
  const shareRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!shareRef.current) return;

    const dataUrl = await htmlToImage.toPng(shareRef.current, {
      pixelRatio: 2,
      backgroundColor: "transparent",
      useCORS: true,
    });

    if (navigator.share) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "player-card.png", { type: "image/png" });
      await navigator.share({ files: [file] });
    } else {
      const link = document.createElement("a");
      link.download = "player-card.png";
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer hover:opacity-80 transition-opacity">
          {children}
        </div>
      </DialogTrigger>

      <DialogContent className="bg-transparent border-none shadow-none p-0 flex flex-col items-center">
        <VisuallyHidden>
          <DialogTitle>Carta do Jogador</DialogTitle>
        </VisuallyHidden>

        {/* 👀 PREVIEW NORMAL (o usuário vê isso) */}
        <PlayerCard {...player} />

        {/* 📸 CANVAS DE EXPORTAÇÃO (OCULTO) */}
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            pointerEvents: "none",
          }}
        >
          <ShareCanvas ref={shareRef} player={player} />
        </div>

        {/* BOTÃO */}
        <button
          onClick={handleShare}
          className="mt-2 px-6 py-2 border rounded-md bg-black/80 text-white hover:bg-black transition"
        >
          Compartilhar
        </button>
      </DialogContent>
    </Dialog>
  );
}
