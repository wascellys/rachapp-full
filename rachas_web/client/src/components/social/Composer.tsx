import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FaImage, FaTimes, FaVideo } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { formatarNome, mensagemErro } from "@/lib/format";
import { social, type PostSocial } from "@/lib/social";
import { AvatarUsuario } from "./Basicos";
import { MentionTextarea } from "./MentionTextarea";
import { SeletorVisibilidade } from "./PostCard";

const MAX_IMAGEM_MB = 10;
const MAX_VIDEO_MB = 50;

/** Caixa de nova publicação: texto com @marcações, foto ou vídeo, reel e visibilidade. */
export function Composer({ onPublicado, reel = false }: { onPublicado: (post: PostSocial) => void; reel?: boolean }) {
  const { user } = useAuth();
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comoReel, setComoReel] = useState(reel);
  const [visibilidade, setVisibilidade] = useState<"PUBLICO" | "AMIGOS">("PUBLICO");
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  if (!user) return null;
  const eu = { id: user.id, username: user.username, nome: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.username, imagem_perfil: user.imagem_perfil ?? null, posicao: user.posicao ?? "" };
  const ehVideo = arquivo?.type.startsWith("video/") ?? false;

  const escolherArquivo = (f: File | undefined) => {
    if (!f) return;
    const video = f.type.startsWith("video/");
    if (!video && !f.type.startsWith("image/")) {
      toast.error("Escolha uma foto ou um vídeo.");
      return;
    }
    const limite = video ? MAX_VIDEO_MB : MAX_IMAGEM_MB;
    if (f.size > limite * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Limite de ${limite} MB.`);
      return;
    }
    setArquivo(f);
    setPreview(URL.createObjectURL(f));
    if (!video) setComoReel(false);
  };

  const limpar = () => {
    setTexto("");
    setArquivo(null);
    setPreview(null);
    setComoReel(reel);
    if (inputRef.current) inputRef.current.value = "";
  };

  const publicar = async () => {
    if (!texto.trim() && !arquivo) return;
    if (comoReel && !ehVideo) {
      toast.error("Reels precisam de um vídeo.");
      return;
    }
    setEnviando(true);
    try {
      const dados = new FormData();
      dados.append("texto", texto.trim());
      dados.append("visibilidade", visibilidade);
      dados.append("formato", comoReel ? "REEL" : "POST");
      if (arquivo) dados.append("midia", arquivo);
      const post = await social.publicar(dados);
      toast.success(comoReel ? "Reel publicado!" : "Publicado!");
      limpar();
      onPublicado(post);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível publicar."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="gap-0 py-0" data-testid="composer">
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-3">
          <AvatarUsuario usuario={eu} />
          <div className="min-w-0 flex-1">
            <MentionTextarea
              value={texto}
              onChange={setTexto}
              maxLength={2200}
              rows={2}
              placeholder={reel ? "Descreva o lance… (@ para marcar)" : `No que você está pensando, ${formatarNome(user.first_name || user.username).split(" ")[0]}?`}
              aria-label="Texto da publicação"
              onEnviar={publicar}
            />
          </div>
        </div>

        {preview && (
          <div className="relative">
            {ehVideo ? (
              <video src={preview} controls playsInline className="max-h-80 w-full rounded-2xl bg-black" aria-label="Prévia do vídeo" />
            ) : (
              <img src={preview} alt="Prévia da foto" className="max-h-80 w-full rounded-2xl bg-muted object-contain" />
            )}
            <button
              type="button"
              onClick={() => {
                setArquivo(null);
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white"
              aria-label="Remover mídia"
            >
              <FaTimes />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={reel ? "video/*" : "image/*,video/*"}
            className="hidden"
            data-testid="input-midia"
            onChange={e => escolherArquivo(e.target.files?.[0])}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            {reel ? <FaVideo /> : <FaImage />} {reel ? "Vídeo" : "Foto/vídeo"}
          </Button>
          {ehVideo && !reel && (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={comoReel} onChange={e => setComoReel(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              Publicar como Reel
            </label>
          )}
          <div className="ml-auto flex items-center gap-2">
            <SeletorVisibilidade valor={visibilidade} onChange={setVisibilidade} />
            <Button onClick={publicar} disabled={enviando || (!texto.trim() && !arquivo)} size="sm">
              {enviando ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
