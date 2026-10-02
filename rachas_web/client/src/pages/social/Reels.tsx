import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FaHeart, FaPlay, FaPlus, FaRegComment, FaRegHeart, FaShareAlt, FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Composer } from "@/components/social/Composer";
import { AvatarUsuario, NomeUsuario, TextoComMencoes } from "@/components/social/Basicos";
import { Comentarios, DialogCompartilhar } from "@/components/social/PostCard";
import { SocialNav } from "@/components/social/SocialNav";
import { useFeed } from "@/components/social/useFeed";
import { mensagemErro } from "@/lib/format";
import { social, type PostSocial } from "@/lib/social";

export default function SocialReels() {
  const feed = useFeed({ feed: "reels" });
  const [publicando, setPublicando] = useState(false);
  const [comSom, setComSom] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      <SocialNav />
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-black">Reels</h1>
        <Button size="sm" onClick={() => setPublicando(true)}>
          <FaPlus /> Novo reel
        </Button>
      </div>

      {!feed.carregando && feed.posts.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-border px-6 py-12 text-center font-bold text-muted-foreground">
          Nenhum reel ainda. Grave um lance do racha e publique!
        </div>
      )}

      {/* Rolagem vertical que encaixa um reel por vez */}
      <div
        className="h-[calc(100dvh-15rem)] snap-y snap-mandatory overflow-y-auto rounded-3xl md:h-[calc(100dvh-12rem)]"
        data-testid="reels-scroller"
      >
        {feed.posts.map(post => (
          <ReelItem
            key={post.id}
            post={post}
            comSom={comSom}
            onAlternarSom={() => setComSom(s => !s)}
            onAtualizado={feed.atualizar}
          />
        ))}
        <div ref={feed.sentinela} className="h-1" aria-hidden />
      </div>

      <Dialog open={publicando} onOpenChange={setPublicando}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo reel</DialogTitle>
            <DialogDescription>Escolha um vídeo vertical de até 50 MB.</DialogDescription>
          </DialogHeader>
          <Composer
            reel
            onPublicado={post => {
              setPublicando(false);
              feed.adicionar(post);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReelItem({
  post,
  comSom,
  onAlternarSom,
  onAtualizado,
}: {
  post: PostSocial;
  comSom: boolean;
  onAlternarSom: () => void;
  onAtualizado: (p: PostSocial) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pausado, setPausado] = useState(true);
  const [comentando, setComentando] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);
  const [totalComentarios, setTotalComentarios] = useState(post.total_comentarios);

  // Toca quando ao menos 60% do reel está visível; pausa ao sair
  useEffect(() => {
    const el = ref.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) video.play().then(() => setPausado(false)).catch(() => setPausado(true));
        else {
          video.pause();
          setPausado(true);
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const alternarPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPausado(false)).catch(() => {});
    else {
      v.pause();
      setPausado(true);
    }
  };

  const curtir = async () => {
    const novo = !post.curtido;
    onAtualizado({ ...post, curtido: novo, total_curtidas: post.total_curtidas + (novo ? 1 : -1) });
    try {
      const res = await social.curtir(post.id, novo);
      onAtualizado({ ...post, curtido: res.curtido, total_curtidas: res.total_curtidas });
    } catch (error) {
      onAtualizado(post);
      toast.error(mensagemErro(error, "Não foi possível curtir."));
    }
  };

  return (
    <div ref={ref} className="relative h-full snap-start snap-always overflow-hidden rounded-3xl bg-black" data-testid="reel">
      <video
        ref={videoRef}
        src={post.midia_url ?? undefined}
        loop
        playsInline
        muted={!comSom}
        preload="metadata"
        onClick={alternarPlay}
        className="h-full w-full cursor-pointer object-cover"
        aria-label={`Reel de ${post.autor.nome}`}
      />
      {pausado && (
        <button type="button" onClick={alternarPlay} className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-black/50 text-2xl text-white" aria-label="Tocar reel">
          <FaPlay />
        </button>
      )}

      <button
        type="button"
        onClick={onAlternarSom}
        className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/50 text-white"
        aria-label={comSom ? "Silenciar" : "Ativar som"}
      >
        {comSom ? <FaVolumeUp /> : <FaVolumeMute />}
      </button>

      {/* Ações laterais */}
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4 text-white">
        <button type="button" onClick={curtir} className="flex flex-col items-center gap-1" aria-pressed={post.curtido} aria-label="Curtir reel">
          {post.curtido ? <FaHeart className="text-2xl text-red-500" /> : <FaRegHeart className="text-2xl" />}
          <span className="text-xs font-black">{post.total_curtidas}</span>
        </button>
        <button type="button" onClick={() => setComentando(true)} className="flex flex-col items-center gap-1" aria-label="Comentar reel">
          <FaRegComment className="text-2xl" />
          <span className="text-xs font-black">{totalComentarios}</span>
        </button>
        <button type="button" onClick={() => setCompartilhando(true)} className="flex flex-col items-center gap-1" aria-label="Compartilhar reel">
          <FaShareAlt className="text-2xl" />
          <span className="text-xs font-black">{post.total_compartilhamentos}</span>
        </button>
      </div>

      {/* Autor e legenda */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pr-16 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <AvatarUsuario usuario={post.autor} className="size-9 border-white/40" />
          <NomeUsuario usuario={post.autor} className="text-white" />
        </div>
        {post.texto && <TextoComMencoes texto={post.texto} mencoes={post.mencoes} className="mt-2 line-clamp-3 text-sm [&_a]:text-primary" />}
      </div>

      <Dialog open={comentando} onOpenChange={setComentando}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
            <DialogDescription className="truncate">Reel de {post.autor.nome}</DialogDescription>
          </DialogHeader>
          <Comentarios postId={post.id} onTotal={setTotalComentarios} />
        </DialogContent>
      </Dialog>
      <DialogCompartilhar aberto={compartilhando} post={post} onFechar={() => setCompartilhando(false)} onCompartilhado={() => setCompartilhando(false)} />
    </div>
  );
}
