import React, { useRef } from "react";
import { toast } from "sonner";
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
import api from "@/lib/api";

interface PlayerCardModalProps {
  children: React.ReactNode;
  player: any; // Using any for now to match existing loose typing, or I could import PlayerCardProps
}

export function PlayerCardModal({ children, player }: PlayerCardModalProps) {
  const shareRef = useRef<HTMLDivElement>(null);
  const [sharePlayer, setSharePlayer] = React.useState(player);

  React.useEffect(() => {
    setSharePlayer(player);
  }, [player]);

  const handleShare = async () => {
    if (!shareRef.current) return;

    try {
      toast.info("Gerando imagem...", { duration: 2000 });

      // 1. Prepare player data, potentially handling CORS images
      let playerForShare = { ...player };
      let photoObjectUrl: string | null = null;
          
      if (player.photo) {
        try {
          // Use our backend proxy to fetch the image to avoid CORS issues with R2
          // The proxy will return the image with appropriate headers or we treat it as same-origin
          const proxyUrl = `/usuarios/proxy_image/?url=${encodeURIComponent(player.photo)}`;
          
          // Fetch from proxy
          const response = await api.get(proxyUrl, { responseType: 'blob' });
          
          if (response.status !== 200) throw new Error("Image proxy failed");
          
          // Create object URL from the proxied blob
          const blob = response.data;
          photoObjectUrl = URL.createObjectURL(blob);
          playerForShare.photo = photoObjectUrl;
          
        } catch (imageError) {
          console.warn("CORS/Fetch error for player photo, sharing without photo:", imageError);
          // Fallback: Remove photo so the card can still be generated (with initials)
          playerForShare.photo = null; 
          toast.warning("Não foi possível carregar a foto para o compartilhamento.", { duration: 3000 });
        }
      }

      // Update state to render ShareCanvas with safe props
      setSharePlayer(playerForShare);
      
      // Allow time for re-render
      await new Promise((resolve) => setTimeout(resolve, 200));

      let dataUrl;
      try {
        dataUrl = await htmlToImage.toPng(shareRef.current, {
          pixelRatio: 2,
          backgroundColor: "transparent",
          useCORS: true,
          skipFonts: true,
        } as any);
      } catch (genError) {
        console.error("Erro na geração da imagem:", genError);
        // If it failed AND we still had a photo, maybe try removing it now?
        if (playerForShare.photo) {
            console.warn("Retrying without photo due to generation error...");
            setSharePlayer({ ...player, photo: null });
             await new Promise(r => setTimeout(r, 200));
             dataUrl = await htmlToImage.toPng(shareRef.current, {
                pixelRatio: 2,
                backgroundColor: "transparent",
                useCORS: true,
                skipFonts: true,
            } as any);
        } else {
             throw new Error("Falha ao desenhar o card. Verifique logs.");
        }
      } finally {
        // Cleanup object URL if created
        if (photoObjectUrl) {
           URL.revokeObjectURL(photoObjectUrl);
        }
      }

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `carta-${player.name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: "image/png" });
      
      const shareData = {
        title: `Carta de ${player.name}`,
        text: `Confira a carta de ${player.name}!`,
        files: [file],
      };

      try {
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success("Compartilhado com sucesso!");
        } else {
          const link = document.createElement("a");
          link.download = `carta-${player.name.toLowerCase().replace(/\s+/g, '-')}.png`;
          link.href = dataUrl;
          link.click();
          toast.success("Imagem salva no dispositivo!");
        }
      } catch (shareError) {
         console.error("Erro na API de share:", shareError);
         const link = document.createElement("a");
         link.download = `carta-${player.name.toLowerCase().replace(/\s+/g, '-')}.png`;
         link.href = dataUrl;
         link.click();
         toast.success("Fallback: Imagem salva!");
      }

    } catch (error) {
      console.error("Erro geral handleShare:", error);
      if (error instanceof Error) {
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.error("Erro desconhecido ao compartilhar.");
      }
    } finally {
        // Restore original player state
        setSharePlayer(player);
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
          <ShareCanvas ref={shareRef} player={sharePlayer} />
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
