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
import { Capacitor } from "@capacitor/core";

interface PlayerCardModalProps {
  children: React.ReactNode;
  player: any;
  rachaName?: string;
}

export function PlayerCardModal({ children, player, rachaName }: PlayerCardModalProps) {
  const shareRef = useRef<HTMLDivElement>(null);
  const [sharePlayer, setSharePlayer] = React.useState(player);

  React.useEffect(() => {
    setSharePlayer(player);
  }, [player]);

  const handleShare = async () => {
    if (!shareRef.current) return;

    try {
      toast.info("Gerando imagem...", { duration: 2000 });

      let playerForShare = { ...player };
      let photoObjectUrl: string | null = null;

      if (player.photo) {
        try {
          const proxyUrl = `/usuarios/proxy_image/?url=${encodeURIComponent(player.photo)}`;
          const response = await api.get(proxyUrl, { responseType: 'blob' });
          if (response.status !== 200) throw new Error("Image proxy failed");
          const blob = response.data;
          photoObjectUrl = URL.createObjectURL(blob);
          playerForShare.photo = photoObjectUrl;
        } catch (imageError) {
          console.warn("CORS/Fetch error for player photo:", imageError);
          playerForShare.photo = null;
          toast.warning("Não foi possível carregar a foto para o compartilhamento.", { duration: 3000 });
        }
      }

      setSharePlayer(playerForShare);
      await new Promise((resolve) => setTimeout(resolve, 200));

      let dataUrl: string;
      try {
        dataUrl = await htmlToImage.toPng(shareRef.current, {
          pixelRatio: 2,
          backgroundColor: "#020617",
          useCORS: true,
          skipFonts: true,
        } as any);
      } catch (genError) {
        console.error("Erro na geração da imagem:", genError);
        if (playerForShare.photo) {
          setSharePlayer({ ...player, photo: null });
          await new Promise(r => setTimeout(r, 200));
          dataUrl = await htmlToImage.toPng(shareRef.current, {
            pixelRatio: 2,
            backgroundColor: "#020617",
            useCORS: true,
            skipFonts: true,
          } as any);
        } else {
          throw new Error("Falha ao desenhar o card.");
        }
      } finally {
        if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
      }

      const fileName = `carta-${player.name.toLowerCase().replace(/\s+/g, '-')}.png`;

      // --- Ambiente nativo Android/iOS via Capacitor ---
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");

        // Remove o prefixo "data:image/png;base64," para obter só o base64
        const base64Data = dataUrl.split(",")[1];

        // Salva no diretório de cache do app
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        // Abre o share nativo (permite salvar na galeria, WhatsApp, etc.)
        await Share.share({
          title: `Carta de ${player.name}`,
          text: `Confira a carta de ${player.name} no RachApp!`,
          url: fileResult.uri,
          dialogTitle: "Compartilhar carta",
        });

        toast.success("Pronto para compartilhar!");
        return;
      }

      // --- Fallback Web (browser) ---
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const shareData = { title: `Carta de ${player.name}`, text: `Confira a carta de ${player.name}!`, files: [file] };

      try {
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success("Compartilhado com sucesso!");
        } else {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = dataUrl;
          link.click();
          toast.success("Imagem salva!");
        }
      } catch (shareError) {
        console.error("Erro na API de share:", shareError);
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        toast.success("Imagem salva!");
      }

    } catch (error) {
      console.error("Erro geral handleShare:", error);
      toast.error(error instanceof Error ? `Erro: ${error.message}` : "Erro desconhecido ao compartilhar.");
    } finally {
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

        {/* Preview interativo */}
        <PlayerCard {...player} />

        {/* Canvas de exportação (oculto) */}
        <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}>
          <ShareCanvas ref={shareRef} player={sharePlayer} rachaName={rachaName} />
        </div>

        {/* Botão */}
        <button
          onClick={handleShare}
          className="mt-2 px-6 py-2 border rounded-full bg-black/80 text-white hover:bg-black transition font-bold text-sm"
        >
          Compartilhar
        </button>
      </DialogContent>
    </Dialog>
  );
}
