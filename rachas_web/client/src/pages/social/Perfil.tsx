import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { FaCheck, FaFilm, FaFutbol, FaHandshake, FaTimes, FaTrophy, FaUserCheck, FaUserClock, FaUserPlus, FaUsers, FaCalendarCheck } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatTile } from "@/components/Stats";
import { AvatarUsuario } from "@/components/social/Basicos";
import { PostCard } from "@/components/social/PostCard";
import { SocialNav } from "@/components/social/SocialNav";
import { useFeed } from "@/components/social/useFeed";
import { formatarData, formatarNome, mensagemErro, posicaoLabel } from "@/lib/format";
import { social, type PerfilSocial } from "@/lib/social";
import { cn } from "@/lib/utils";

export default function SocialPerfil() {
  const [, params] = useRoute("/social/perfil/:username");
  const username = params?.username ?? "";
  const [perfil, setPerfil] = useState<PerfilSocial | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<"POST" | "REEL">("POST");

  useEffect(() => {
    setPerfil(null);
    setErro(null);
    social
      .perfil(username)
      .then(setPerfil)
      .catch(e => setErro(e?.response?.status === 404 ? "Jogador não encontrado." : mensagemErro(e)));
  }, [username]);

  if (erro) {
    return (
      <div className="mx-auto max-w-2xl">
        <SocialNav />
        <p className="rounded-3xl border-2 border-dashed border-border p-10 text-center font-bold text-muted-foreground">{erro}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <SocialNav />
      {!perfil ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <AvatarUsuario usuario={perfil} link={false} className="size-24 border-4 border-primary/40" />
              <div className="w-full min-w-0 flex-1 space-y-1">
                <h1 className="truncate text-2xl font-black" title={formatarNome(perfil.nome)}>{formatarNome(perfil.nome)}</h1>
                <p className="truncate text-sm font-semibold text-muted-foreground">@{perfil.username}</p>
                <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                  {perfil.posicao && <Badge variant="outline">{posicaoLabel(perfil.posicao)}</Badge>}
                  <Badge variant="muted">No RachApp desde {formatarData(perfil.membro_desde, { day: undefined, month: "long" })}</Badge>
                </div>
                <p className="pt-1 text-sm font-semibold text-muted-foreground">
                  <strong className="text-foreground">{perfil.social.amigos}</strong> {perfil.social.amigos === 1 ? "amigo" : "amigos"} ·{" "}
                  <strong className="text-foreground">{perfil.social.posts}</strong> {perfil.social.posts === 1 ? "post" : "posts"} ·{" "}
                  <strong className="text-foreground">{perfil.social.reels}</strong> {perfil.social.reels === 1 ? "reel" : "reels"}
                </p>
              </div>
              <BotaoAmizade perfil={perfil} onMudou={setPerfil} />
            </div>
          </section>

          <section aria-label="Estatísticas em todos os rachas">
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Em todos os rachas</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="Gols" value={perfil.estatisticas.gols} icon={<FaFutbol />} />
              <StatTile label="Assist." value={perfil.estatisticas.assistencias} icon={<FaHandshake />} />
              <StatTile label="Jogos" value={perfil.estatisticas.jogos} icon={<FaCalendarCheck />} />
              <StatTile label="Rachas" value={perfil.estatisticas.rachas} icon={<FaUsers />} />
              <StatTile label="Prêmios" value={perfil.estatisticas.premios} icon={<FaTrophy />} className="col-span-2 sm:col-span-1" />
            </div>
          </section>

          <div className="flex gap-2" role="tablist" aria-label="Publicações">
            {([
              ["POST", "Posts"],
              ["REEL", "Reels"],
            ] as const).map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={aba === valor}
                onClick={() => setAba(valor)}
                className={cn(
                  "rounded-full border-2 px-4 py-1.5 text-sm font-extrabold",
                  aba === valor ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <PublicacoesDoPerfil key={`${perfil.username}-${aba}`} username={perfil.username} formato={aba} />
        </div>
      )}
    </div>
  );
}

function PublicacoesDoPerfil({ username, formato }: { username: string; formato: "POST" | "REEL" }) {
  const feed = useFeed({ autor: username, formato });
  if (!feed.carregando && feed.posts.length === 0) {
    return <p className="rounded-3xl border-2 border-dashed border-border p-10 text-center font-bold text-muted-foreground">Nada por aqui ainda.</p>;
  }
  if (formato === "REEL") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {feed.posts.map(p => (
          <Link key={p.id} href={`/social/post/${p.id}`} className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black" aria-label={`Abrir reel: ${p.texto || "sem legenda"}`}>
            <video src={p.midia_url ?? undefined} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            <FaFilm className="absolute right-2 top-2 text-white drop-shadow" aria-hidden />
          </Link>
        ))}
        <div ref={feed.sentinela} className="h-1" aria-hidden />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {feed.posts.map(p => (
        <PostCard key={p.id} post={p} onRemovido={feed.remover} onAtualizado={feed.atualizar} />
      ))}
      <div ref={feed.sentinela} className="h-1" aria-hidden />
      {feed.carregando && <Skeleton className="h-40 w-full rounded-2xl" />}
    </div>
  );
}

function BotaoAmizade({ perfil, onMudou }: { perfil: PerfilSocial; onMudou: (p: PerfilSocial) => void }) {
  const [ocupado, setOcupado] = useState(false);

  const executar = async (acao: () => Promise<Partial<PerfilSocial>>, sucesso: string) => {
    setOcupado(true);
    try {
      const mudanca = await acao();
      onMudou({ ...perfil, ...mudanca });
      toast.success(sucesso);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível concluir."));
    } finally {
      setOcupado(false);
    }
  };

  switch (perfil.amizade) {
    case "eu":
      return (
        <Link href="/perfil">
          <Button variant="outline">Editar perfil</Button>
        </Link>
      );
    case "nenhuma":
      return (
        <Button
          disabled={ocupado}
          onClick={() => executar(async () => {
            const r = await social.pedirAmizade(perfil.id);
            return { amizade: r.amizade, amizade_id: r.amizade_id };
          }, "Pedido de amizade enviado!")}
        >
          <FaUserPlus /> Adicionar amigo
        </Button>
      );
    case "enviada":
      return (
        <Button
          variant="outline"
          disabled={ocupado}
          onClick={() => executar(async () => {
            await social.removerAmizade(perfil.amizade_id!);
            return { amizade: "nenhuma", amizade_id: null };
          }, "Pedido cancelado.")}
        >
          <FaUserClock /> Cancelar pedido
        </Button>
      );
    case "recebida":
      return (
        <div className="flex gap-2">
          <Button
            disabled={ocupado}
            onClick={() => executar(async () => {
              await social.aceitarAmizade(perfil.amizade_id!);
              return { amizade: "amigos", social: { ...perfil.social, amigos: perfil.social.amigos + 1 } };
            }, "Agora vocês são amigos!")}
          >
            <FaCheck /> Aceitar
          </Button>
          <Button
            variant="outline"
            disabled={ocupado}
            onClick={() => executar(async () => {
              await social.removerAmizade(perfil.amizade_id!);
              return { amizade: "nenhuma", amizade_id: null };
            }, "Pedido recusado.")}
          >
            <FaTimes /> Recusar
          </Button>
        </div>
      );
    default:
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={ocupado}>
              <FaUserCheck /> Amigos
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => executar(async () => {
                await social.removerAmizade(perfil.amizade_id!);
                return { amizade: "nenhuma", amizade_id: null, social: { ...perfil.social, amigos: perfil.social.amigos - 1 } };
              }, "Amizade desfeita.")}
            >
              Desfazer amizade
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
  }
}
