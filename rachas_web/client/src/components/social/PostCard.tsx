import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { FaGlobeAmericas, FaHeart, FaLink, FaRegComment, FaRegHeart, FaRetweet, FaShareAlt, FaTrash, FaUserFriends } from "react-icons/fa";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ConfirmDialog";
import { mensagemErro } from "@/lib/format";
import { linkDoPost, social, tempoRelativo, type Comentario, type PostOriginal, type PostSocial } from "@/lib/social";
import { cn } from "@/lib/utils";
import { AvatarUsuario, NomeUsuario, TextoComMencoes } from "./Basicos";
import { MentionTextarea } from "./MentionTextarea";

export function Midia({ post, className }: { post: PostOriginal; className?: string }) {
  if (!post.midia_url) return null;
  return post.tipo_midia === "VIDEO" ? (
    <video
      src={post.midia_url}
      controls
      playsInline
      preload="metadata"
      className={cn("max-h-[520px] w-full rounded-2xl bg-black", className)}
      aria-label={`Vídeo de ${post.autor.nome}`}
    />
  ) : (
    <img src={post.midia_url} alt={`Foto de ${post.autor.nome}`} loading="lazy" className={cn("max-h-[560px] w-full rounded-2xl bg-muted object-contain", className)} />
  );
}

function Cabecalho({ post, menu }: { post: PostOriginal & { visibilidade?: string }; menu?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <AvatarUsuario usuario={post.autor} />
      <div className="min-w-0 flex-1">
        <NomeUsuario usuario={post.autor} className="block" />
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span className="truncate">@{post.autor.username}</span>
          <span aria-hidden>·</span>
          <Link href={`/social/post/${post.id}`} className="shrink-0 hover:underline">
            {tempoRelativo(post.criado_em)}
          </Link>
          {post.visibilidade && (
            <span className="shrink-0" title={post.visibilidade === "AMIGOS" ? "Só amigos" : "Público"}>
              {post.visibilidade === "AMIGOS" ? <FaUserFriends aria-label="Só amigos" /> : <FaGlobeAmericas aria-label="Público" />}
            </span>
          )}
          {post.formato === "REEL" && <span className="shrink-0 rounded-full bg-primary/15 px-1.5 text-[10px] font-black text-primary">REEL</span>}
        </p>
      </div>
      {menu}
    </div>
  );
}

interface PostCardProps {
  post: PostSocial;
  onAtualizado?: (post: PostSocial) => void;
  onRemovido?: (id: string) => void;
  onCompartilhado?: (novo: PostSocial) => void;
  comentariosAbertos?: boolean;
}

export function PostCard({ post, onAtualizado, onRemovido, onCompartilhado, comentariosAbertos = false }: PostCardProps) {
  const [confirm, confirmDialog] = useConfirm();
  const [curtido, setCurtido] = useState(post.curtido);
  const [curtidas, setCurtidas] = useState(post.total_curtidas);
  const [totalComentarios, setTotalComentarios] = useState(post.total_comentarios);
  const [abrirComentarios, setAbrirComentarios] = useState(comentariosAbertos);
  const [compartilhando, setCompartilhando] = useState(false);

  useEffect(() => {
    setCurtido(post.curtido);
    setCurtidas(post.total_curtidas);
    setTotalComentarios(post.total_comentarios);
  }, [post]);

  const alternarCurtida = async () => {
    const novo = !curtido;
    setCurtido(novo);
    setCurtidas(n => n + (novo ? 1 : -1));
    try {
      const res = await social.curtir(post.id, novo);
      setCurtido(res.curtido);
      setCurtidas(res.total_curtidas);
      onAtualizado?.({ ...post, curtido: res.curtido, total_curtidas: res.total_curtidas });
    } catch (error) {
      setCurtido(!novo);
      setCurtidas(n => n + (novo ? -1 : 1));
      toast.error(mensagemErro(error, "Não foi possível curtir."));
    }
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkDoPost(post.id));
      toast.success("Link copiado!");
    } catch {
      toast.info(linkDoPost(post.id));
    }
  };

  const compartilharFora = async () => {
    const url = linkDoPost(post.id);
    if (navigator.share) {
      try {
        await navigator.share({ title: "RachApp", text: post.texto.slice(0, 100) || "Olha esse post no RachApp", url });
      } catch {
        /* cancelado */
      }
    } else {
      copiarLink();
    }
  };

  const apagar = async () => {
    const ok = await confirm({
      title: "Apagar este post?",
      description: "Curtidas e comentários também serão apagados. Não dá para desfazer.",
      confirmText: "Apagar post",
      destructive: true,
    });
    if (!ok) return;
    try {
      await social.apagar(post.id);
      toast.success("Post apagado.");
      onRemovido?.(post.id);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível apagar."));
    }
  };

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Opções do post">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl">
        <DropdownMenuItem onClick={copiarLink}>
          <FaLink /> Copiar link
        </DropdownMenuItem>
        {post.pode_excluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={apagar} className="text-destructive focus:text-destructive">
              <FaTrash /> Apagar post
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card className="gap-0 py-0" data-testid="post-card">
      {confirmDialog}
      <CardContent className="space-y-3 p-4">
        {post.eh_compartilhamento && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <FaRetweet aria-hidden /> compartilhou
          </p>
        )}
        <Cabecalho post={post} menu={menu} />
        {post.texto && <TextoComMencoes texto={post.texto} mencoes={post.mencoes} />}
        {!post.eh_compartilhamento && <Midia post={post} />}
        {post.eh_compartilhamento &&
          (post.original ? (
            <div className="space-y-3 rounded-2xl border-2 border-border p-3">
              <Cabecalho post={post.original} />
              {post.original.texto && <TextoComMencoes texto={post.original.texto} mencoes={post.original.mencoes} />}
              <Midia post={post.original} />
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-border p-4 text-center text-sm font-semibold text-muted-foreground">
              Este conteúdo não está mais disponível.
            </div>
          ))}

        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{curtidas} {curtidas === 1 ? "curtida" : "curtidas"}</span>
          <span>
            {totalComentarios} {totalComentarios === 1 ? "comentário" : "comentários"}
            {post.total_compartilhamentos > 0 && ` · ${post.total_compartilhamentos} ${post.total_compartilhamentos === 1 ? "compartilhamento" : "compartilhamentos"}`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 border-t-2 border-border pt-2">
          <Button variant="ghost" size="sm" onClick={alternarCurtida} aria-pressed={curtido} className={curtido ? "text-destructive" : ""}>
            {curtido ? <FaHeart /> : <FaRegHeart />} Curtir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAbrirComentarios(a => !a)} aria-expanded={abrirComentarios}>
            <FaRegComment /> Comentar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <FaShareAlt /> Compartilhar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem onClick={() => setCompartilhando(true)}>
                <FaRetweet /> Compartilhar no feed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={compartilharFora}>
                <FaShareAlt /> Enviar para…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copiarLink}>
                <FaLink /> Copiar link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {abrirComentarios && <Comentarios postId={post.id} onTotal={setTotalComentarios} />}
      </CardContent>

      <DialogCompartilhar
        aberto={compartilhando}
        post={post}
        onFechar={() => setCompartilhando(false)}
        onCompartilhado={novo => {
          setCompartilhando(false);
          onCompartilhado?.(novo);
        }}
      />
    </Card>
  );
}

export function DialogCompartilhar({
  aberto,
  post,
  onFechar,
  onCompartilhado,
}: {
  aberto: boolean;
  post: PostSocial;
  onFechar: () => void;
  onCompartilhado: (novo: PostSocial) => void;
}) {
  const [texto, setTexto] = useState("");
  const [visibilidade, setVisibilidade] = useState<"PUBLICO" | "AMIGOS">("PUBLICO");
  const [enviando, setEnviando] = useState(false);
  const original = post.eh_compartilhamento ? post.original : post;

  const enviar = async () => {
    setEnviando(true);
    try {
      const novo = await social.compartilhar(post.id, texto, visibilidade);
      toast.success("Compartilhado no seu feed!");
      setTexto("");
      onCompartilhado(novo);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível compartilhar."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={o => !o && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar no feed</DialogTitle>
          <DialogDescription>Escreva algo e marque amigos com @.</DialogDescription>
        </DialogHeader>
        <MentionTextarea value={texto} onChange={setTexto} placeholder="Diga algo sobre isso…" maxLength={2200} aria-label="Texto do compartilhamento" />
        {original && (
          <div className="max-h-60 space-y-2 overflow-hidden rounded-2xl border-2 border-border p-3">
            <Cabecalho post={original} />
            {original.texto && <TextoComMencoes texto={original.texto} mencoes={original.mencoes} className="line-clamp-3 text-sm" />}
          </div>
        )}
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <SeletorVisibilidade valor={visibilidade} onChange={setVisibilidade} />
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? "Compartilhando…" : "Compartilhar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SeletorVisibilidade({ valor, onChange }: { valor: "PUBLICO" | "AMIGOS"; onChange: (v: "PUBLICO" | "AMIGOS") => void }) {
  return (
    <select
      value={valor}
      onChange={e => onChange(e.target.value as "PUBLICO" | "AMIGOS")}
      aria-label="Quem pode ver"
      className="h-9 rounded-full border-2 border-input bg-background px-3 text-sm font-bold"
    >
      <option value="PUBLICO">Público</option>
      <option value="AMIGOS">Só amigos</option>
    </select>
  );
}

export function Comentarios({ postId, onTotal }: { postId: string; onTotal: (n: number) => void }) {
  const [lista, setLista] = useState<Comentario[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    social.comentarios(postId).then(setLista).catch(() => setLista([]));
  }, [postId]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const novo = await social.comentar(postId, texto.trim());
      const atual = [...(lista ?? []), novo];
      setLista(atual);
      onTotal(atual.length);
      setTexto("");
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível comentar."));
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async (c: Comentario) => {
    try {
      await social.apagarComentario(c.id);
      const atual = (lista ?? []).filter(x => x.id !== c.id);
      setLista(atual);
      onTotal(atual.length);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível apagar o comentário."));
    }
  };

  return (
    <div className="space-y-3 border-t-2 border-border pt-3" data-testid="comentarios">
      {lista === null ? (
        <p className="text-sm text-muted-foreground">Carregando comentários…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Seja o primeiro a comentar.</p>
      ) : (
        <ul className="space-y-3">
          {lista.map(c => (
            <li key={c.id} className="flex gap-2">
              <AvatarUsuario usuario={c.autor} className="size-8" />
              <div className="min-w-0 flex-1 rounded-2xl bg-muted/60 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <NomeUsuario usuario={c.autor} className="text-sm" />
                  <span className="shrink-0 text-xs text-muted-foreground">{tempoRelativo(c.criado_em)}</span>
                  {c.pode_excluir && (
                    <button
                      type="button"
                      onClick={() => apagar(c)}
                      className="ml-auto shrink-0 text-xs font-bold text-muted-foreground hover:text-destructive"
                      aria-label="Apagar comentário"
                    >
                      Apagar
                    </button>
                  )}
                </div>
                <TextoComMencoes texto={c.texto} mencoes={c.mencoes} className="text-sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <MentionTextarea
            value={texto}
            onChange={setTexto}
            rows={1}
            maxLength={1000}
            placeholder="Escreva um comentário… (@ para marcar)"
            aria-label="Escrever comentário"
            onEnviar={enviar}
          />
        </div>
        <Button onClick={enviar} disabled={enviando || !texto.trim()} size="sm">
          Enviar
        </Button>
      </div>
    </div>
  );
}
