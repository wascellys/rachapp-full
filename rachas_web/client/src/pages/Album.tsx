import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { FaArrowLeft, FaBoxOpen, FaCog, FaLayerGroup, FaMagic, FaSearch, FaTrophy } from "react-icons/fa";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatTile } from "@/components/Stats";
import { Figurinha } from "@/components/Figurinha";
import { TIER_THEME } from "@/lib/playerRating";
import {
  RARIDADES,
  RARIDADE_TIER,
  numeroFigurinha,
  type AlbumResponse,
  type FigurinhaSlot,
  type FigurinhaSorteada,
  type JogadorAlbum,
  type PaginaAlbum,
} from "@/lib/album";
import { iniciais, mensagemErro, nomeCurto, posicaoLabel } from "@/lib/format";
import { invalidateRachaCache } from "@/lib/useRachaCache";

type Filtro = "todas" | "faltando" | "completas" | "colar";

interface FigurinhaEmFoco {
  figurinha: FigurinhaSlot;
  jogador: JogadorAlbum;
  pagina: number;
}

export default function Album() {
  const [, params] = useRoute("/racha/:id/album");
  const id = params?.id;
  const [data, setData] = useState<AlbumResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [abrindo, setAbrindo] = useState(false);
  const [emFoco, setEmFoco] = useState<FigurinhaEmFoco | null>(null);

  const carregar = async () => {
    try {
      const res = await api.get<AlbumResponse>(`/rachas/${id}/album/`);
      setData(res.data);
      setErro(null);
    } catch (error: any) {
      setErro(error?.response?.status === 404 ? "Racha não encontrado ou você não participa dele." : mensagemErro(error));
    }
  };

  useEffect(() => {
    if (id) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const colar = async (figurinhaIds?: string[]) => {
    try {
      const res = await api.post(`/rachas/${id}/album/colar/`, figurinhaIds ? { figurinha_ids: figurinhaIds } : {});
      if (res.data.coladas > 0) {
        toast.success(res.data.coladas === 1 ? "Figurinha colada!" : `${res.data.coladas} figurinhas coladas!`);
      }
      if (id) invalidateRachaCache(id);
      await carregar();
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível colar."));
    }
  };

  const paginas = data?.paginas ?? [];
  const paginasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return paginas.filter(p => {
      if (termo && !`${p.jogador.nome} ${p.jogador.username}`.toLowerCase().includes(termo)) return false;
      const coladas = p.figurinhas.filter(f => f.colada).length;
      if (filtro === "completas") return coladas === p.figurinhas.length;
      if (filtro === "faltando") return coladas < p.figurinhas.length;
      if (filtro === "colar") return p.figurinhas.some(f => f.quantidade > 0 && !f.colada);
      return true;
    });
  }, [paginas, busca, filtro]);

  const repetidas = useMemo(
    () =>
      paginas.flatMap(p =>
        p.figurinhas.filter(f => f.quantidade > 1).map(f => ({ ...f, jogador: p.jogador, pagina: p.numero, extras: f.quantidade - 1 })),
      ),
    [paginas],
  );

  if (!data && !erro) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (erro || !data) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="space-y-4 py-10">
          <p className="font-bold">{erro}</p>
          <Link href="/"><Button variant="outline">Voltar</Button></Link>
        </CardContent>
      </Card>
    );
  }

  const voltar = (
    <Link href={`/racha/${id}`} className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
      <FaArrowLeft className="shrink-0" aria-hidden /> <span className="truncate">{data.racha_nome}</span>
    </Link>
  );

  if (!data.existe || !data.album || !data.progresso) {
    return (
      <div className="space-y-6">
        {voltar}
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-3xl text-muted-foreground"><FaLayerGroup /></div>
          <div>
            <h1 className="text-xl font-black">Álbum ainda não criado</h1>
            <p className="text-muted-foreground">
              {data.is_admin ? "Crie o álbum para começar a distribuir pacotes de figurinhas." : "Quando o administrador criar o álbum, seus pacotes aparecem aqui."}
            </p>
          </div>
          {data.is_admin && (
            <Link href={`/racha/${id}/album/gerenciar`}><Button><FaMagic /> Criar álbum</Button></Link>
          )}
        </div>
      </div>
    );
  }

  const { album, progresso } = data;
  const pacotes = data.pacotes_fechados ?? [];

  return (
    <div className="space-y-6">
      {voltar}

      {/* Cabeçalho com progresso */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-card p-5 md:p-7" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-2xl font-black tracking-tight md:text-3xl" title={album.titulo}>{album.titulo}</h1>
              {data.is_admin && (
                <Link href={`/racha/${id}/album/gerenciar`} className="shrink-0">
                  <Button variant="outline" size="sm"><FaCog /> Gerenciar</Button>
                </Link>
              )}
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-bold">
                <span><span className="text-2xl font-black tabular-nums">{progresso.coladas}</span> / {progresso.total} coladas</span>
                <span className="tabular-nums text-primary">{progresso.percentual}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progresso.percentual} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progresso.percentual}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {RARIDADES.map(r => {
                const t = TIER_THEME[RARIDADE_TIER[r]];
                const p = progresso.por_raridade[r];
                return (
                  <span key={r} className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-2.5 py-0.5 text-xs font-extrabold">
                    <span className="size-2.5 rounded-full" style={{ background: t.frame }} aria-hidden />
                    {t.label} <span className="tabular-nums text-muted-foreground">{p.coladas}/{p.total}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Pacotes fechados */}
          <div className="flex shrink-0 items-center gap-4 self-center">
            {pacotes.length > 0 ? (
              <button type="button" onClick={() => setAbrindo(true)} className="group relative" aria-label={`Abrir pacote (${pacotes.length} disponíveis)`}>
                <div className="pacote pacote-tremendo group-hover:scale-105">
                  <FaBoxOpen className="text-3xl" aria-hidden />
                  <span className="text-2xl font-black leading-none">Pacote</span>
                  <span className="text-sm font-bold opacity-90">{pacotes[0].quantidade_figurinhas} figurinhas</span>
                </div>
                {pacotes.length > 1 && (
                  <span className="absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full border-4 border-card bg-gold text-sm font-black text-black">
                    {pacotes.length}
                  </span>
                )}
                <span className="mt-2 block text-sm font-black text-primary">Toque para abrir</span>
              </button>
            ) : (
              <div className="max-w-[200px] text-center text-sm font-semibold text-muted-foreground">
                <FaBoxOpen className="mx-auto mb-2 text-3xl" aria-hidden />
                Sem pacotes por enquanto. Eles chegam depois das partidas.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Páginas" value={album.total_paginas} />
        <StatTile label="Para colar" value={progresso.para_colar} />
        <StatTile label="Repetidas" value={progresso.repetidas} />
        <StatTile label="Pacotes" value={pacotes.length} hint="para abrir" />
      </div>

      {progresso.para_colar > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border-2 border-primary/40 bg-primary/10 p-4 sm:flex-row">
          <p className="font-bold">
            Você tem <strong className="text-primary">{progresso.para_colar}</strong> {progresso.para_colar === 1 ? "figurinha nova" : "figurinhas novas"} para colar.
          </p>
          <Button onClick={() => colar()}><FaMagic /> Colar todas</Button>
        </div>
      )}

      <Tabs defaultValue="album">
        <TabsList>
          <TabsTrigger value="album">Álbum</TabsTrigger>
          <TabsTrigger value="repetidas">Repetidas ({progresso.repetidas})</TabsTrigger>
          <TabsTrigger value="colecionadores">Colecionadores</TabsTrigger>
        </TabsList>

        <TabsContent value="album" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:max-w-xs sm:flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar jogador" className="pl-9" aria-label="Buscar jogador no álbum" />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar páginas">
              {([
                ["todas", "Todas"],
                ["faltando", "Faltando"],
                ["completas", "Completas"],
                ["colar", "Para colar"],
              ] as [Filtro, string][]).map(([valor, label]) => (
                <Button key={valor} size="sm" variant={filtro === valor ? "default" : "outline"} onClick={() => setFiltro(valor)} aria-pressed={filtro === valor}>
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {paginasFiltradas.length === 0 ? (
            <p className="py-10 text-center font-bold text-muted-foreground">Nenhuma página encontrada.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginasFiltradas.map(p => (
                <PaginaCard
                  key={p.id}
                  pagina={p}
                  onColar={ids => colar(ids)}
                  onAmpliar={f => setEmFoco({ figurinha: f, jogador: p.jogador, pagina: p.numero })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="repetidas" className="mt-6">
          {repetidas.length === 0 ? (
            <p className="py-10 text-center font-bold text-muted-foreground">Nenhuma repetida ainda.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">Guarde suas repetidas: elas vão valer nas trocas entre jogadores.</p>
              <div className="flex flex-wrap gap-4">
                {repetidas.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setEmFoco({ figurinha: f, jogador: f.jogador, pagina: f.pagina })}
                    className="rounded-xl [--fig-w:104px]"
                    aria-label={`Ampliar figurinha de ${f.jogador.nome}`}
                  >
                    <Figurinha
                      raridade={f.raridade}
                      numero={f.numero}
                      nome={f.jogador.nome}
                      posicao={f.jogador.posicao}
                      foto={f.jogador.imagem_perfil}
                      repetidas={f.extras}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="colecionadores" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FaTrophy className="text-gold" aria-hidden /> Maiores colecionadores</CardTitle>
              <CardDescription>Quem mais completou o álbum. Não vale pontos no ranking do racha.</CardDescription>
            </CardHeader>
            <CardContent>
              {(data.colecionadores ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Ninguém colou figurinhas ainda.</p>
              ) : (
                <ol className="space-y-3">
                  {data.colecionadores!.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-right text-sm font-black tabular-nums text-muted-foreground">{i + 1}</span>
                      <Avatar className="size-9 shrink-0 rounded-full">
                        <AvatarImage src={c.imagem_perfil || undefined} className="object-cover" />
                        <AvatarFallback className="bg-muted text-xs font-black">{iniciais(c.nome)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-bold" title={c.nome}>
                            <span className="sm:hidden">{nomeCurto(c.nome)}</span>
                            <span className="hidden sm:inline">{c.nome}</span>
                          </span>
                          <span className="shrink-0 text-sm font-black tabular-nums">{c.coladas} <span className="text-xs text-muted-foreground">({c.percentual}%)</span></span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${c.percentual}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AbrirPacoteDialog
        open={abrindo}
        rachaId={id!}
        restantes={pacotes.length}
        onOpenChange={aberto => {
          setAbrindo(aberto);
          if (!aberto) carregar();
        }}
        onColar={ids => colar(ids)}
      />

      <FigurinhaAmpliada emFoco={emFoco} onClose={() => setEmFoco(null)} />
    </div>
  );
}

/** Mostra uma figurinha colada em tamanho grande, no centro da tela. */
function FigurinhaAmpliada({ emFoco, onClose }: { emFoco: FigurinhaEmFoco | null; onClose: () => void }) {
  const f = emFoco?.figurinha;
  const theme = f ? TIER_THEME[RARIDADE_TIER[f.raridade]] : null;
  const extras = f ? Math.max(0, f.quantidade - 1) : 0;
  return (
    <Dialog open={!!emFoco} onOpenChange={aberto => !aberto && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-w-[360px] flex-col items-center gap-4 border-none bg-transparent p-0 shadow-none">
        {emFoco && f && theme && (
          <>
            <DialogTitle className="sr-only">Figurinha {numeroFigurinha(f.numero)} de {emFoco.jogador.nome}</DialogTitle>
            <DialogDescription className="sr-only">
              Raridade {theme.label}, página {emFoco.pagina} do álbum.
            </DialogDescription>
            <div className="fig-ampliada [--fig-w:min(78vw,300px)]">
              <Figurinha
                raridade={f.raridade}
                numero={f.numero}
                nome={emFoco.jogador.nome}
                posicao={emFoco.jogador.posicao}
                foto={emFoco.jogador.imagem_perfil}
              />
            </div>
            <div className="w-full rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-center text-white backdrop-blur">
              <p className="truncate text-lg font-black" title={emFoco.jogador.nome}>{emFoco.jogador.nome}</p>
              <p className="text-sm font-semibold text-white/75">
                {theme.label} · {numeroFigurinha(f.numero)} · Página {emFoco.pagina}
              </p>
              {extras > 0 && (
                <p className="mt-1 text-sm font-bold text-white">
                  Você tem {extras} {extras === 1 ? "repetida" : "repetidas"} desta figurinha
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/20"
            >
              Fechar
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaginaCard({
  pagina,
  onColar,
  onAmpliar,
}: {
  pagina: PaginaAlbum;
  onColar: (ids: string[]) => void;
  onAmpliar: (figurinha: FigurinhaSlot) => void;
}) {
  const coladas = pagina.figurinhas.filter(f => f.colada).length;
  const completa = coladas === pagina.figurinhas.length;
  return (
    <Card className={`py-0 ${completa ? "border-gold/60" : ""}`}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0 rounded-full border-2 border-border">
            <AvatarImage src={pagina.jogador.imagem_perfil || undefined} className="object-cover" />
            <AvatarFallback className="bg-muted text-xs font-black">{iniciais(pagina.jogador.nome)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold" title={pagina.jogador.nome}>{pagina.jogador.nome}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              Página {pagina.numero} · {posicaoLabel(pagina.jogador.posicao)}
            </p>
          </div>
          {completa ? (
            <Badge variant="gold" className="shrink-0">Completa</Badge>
          ) : (
            <span className="shrink-0 text-sm font-black tabular-nums text-muted-foreground">{coladas}/{pagina.figurinhas.length}</span>
          )}
        </div>
        <div className="album-slots grid grid-cols-4 gap-2 pt-1">
          {pagina.figurinhas.map(f => {
            const estado = f.colada ? "colada" : f.quantidade > 0 ? "pendente" : "vazia";
            const fig = (
              <Figurinha
                raridade={f.raridade}
                numero={f.numero}
                nome={pagina.jogador.nome}
                posicao={pagina.jogador.posicao}
                foto={pagina.jogador.imagem_perfil}
                estado={estado}
                repetidas={Math.max(0, f.quantidade - 1)}
              />
            );
            return estado === "pendente" ? (
              <button key={f.id} type="button" onClick={() => onColar([f.id])} className="rounded-xl" aria-label={`Colar figurinha de ${pagina.jogador.nome}`}>
                {fig}
              </button>
            ) : estado === "colada" ? (
              <button
                key={f.id}
                type="button"
                onClick={() => onAmpliar(f)}
                className="rounded-xl transition-transform hover:-translate-y-0.5"
                aria-label={`Ampliar figurinha de ${pagina.jogador.nome}`}
              >
                {fig}
              </button>
            ) : (
              <div key={f.id}>{fig}</div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AbrirPacoteDialog({
  open,
  rachaId,
  restantes,
  onOpenChange,
  onColar,
}: {
  open: boolean;
  rachaId: string;
  restantes: number;
  onOpenChange: (open: boolean) => void;
  onColar: (ids: string[]) => Promise<void> | void;
}) {
  const [figurinhas, setFigurinhas] = useState<FigurinhaSorteada[] | null>(null);
  const [reveladas, setReveladas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [sobrando, setSobrando] = useState(restantes);

  useEffect(() => {
    if (open) {
      setFigurinhas(null);
      setReveladas(0);
      setSobrando(restantes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Revela uma figurinha por vez
  useEffect(() => {
    if (!figurinhas || reveladas >= figurinhas.length) return;
    const t = setTimeout(() => setReveladas(n => n + 1), reveladas === 0 ? 350 : 280);
    return () => clearTimeout(t);
  }, [figurinhas, reveladas]);

  const abrir = async () => {
    setCarregando(true);
    try {
      const res = await api.post(`/rachas/${rachaId}/album/abrir/`, {});
      setFigurinhas(res.data.figurinhas);
      setSobrando(res.data.restantes);
      setReveladas(0);
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível abrir o pacote."));
    } finally {
      setCarregando(false);
    }
  };

  const terminou = figurinhas !== null && reveladas >= figurinhas.length;
  const novas = figurinhas?.filter(f => f.nova) ?? [];
  const idsNovas = Array.from(new Set(novas.map(f => f.id)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="text-center text-2xl font-black">{figurinhas ? "Seu pacote" : "Abrir pacote"}</DialogTitle>
        <DialogDescription className="text-center">
          {figurinhas
            ? terminou
              ? `${novas.length} ${novas.length === 1 ? "nova" : "novas"} · ${figurinhas.length - novas.length} ${figurinhas.length - novas.length === 1 ? "repetida" : "repetidas"}`
              : "Revelando..."
            : `Você tem ${sobrando} ${sobrando === 1 ? "pacote" : "pacotes"} para abrir.`}
        </DialogDescription>

        {!figurinhas ? (
          <div className="flex flex-col items-center gap-5 py-6">
            <button type="button" onClick={abrir} disabled={carregando} className="pacote pacote-tremendo" aria-label="Rasgar o pacote">
              <FaBoxOpen className="text-4xl" aria-hidden />
              <span className="text-3xl font-black leading-none">Pacote</span>
            </button>
            <Button size="lg" onClick={abrir} disabled={carregando}>{carregando ? "Abrindo..." : "Rasgar o pacote"}</Button>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="flex flex-wrap justify-center gap-3">
              {figurinhas.map((f, i) => (
                <div key={`${f.id}-${i}`} className={`fig-reveal [--fig-w:96px] sm:[--fig-w:110px] ${i < reveladas ? "virada" : ""}`}>
                  <div className="fig-reveal-inner">
                    <div className="fig-reveal-verso">
                      <div className="fig-verso">RA</div>
                    </div>
                    <div className="fig-reveal-frente">
                      <Figurinha
                        raridade={f.raridade}
                        numero={f.numero}
                        nome={f.jogador.nome}
                        posicao={f.jogador.posicao}
                        foto={f.jogador.imagem_perfil}
                        nova={f.nova && i < reveladas}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              {!terminou && <Button variant="outline" onClick={() => setReveladas(figurinhas.length)}>Revelar todas</Button>}
              {terminou && idsNovas.length > 0 && (
                <Button
                  onClick={async () => {
                    await onColar(idsNovas);
                    if (sobrando > 0) setFigurinhas(null);
                    else onOpenChange(false);
                  }}
                >
                  <FaMagic /> Colar {idsNovas.length === 1 ? "a nova" : `as ${idsNovas.length} novas`} no álbum
                </Button>
              )}
              {terminou && sobrando > 0 && (
                <Button variant="outline" onClick={() => setFigurinhas(null)}>
                  Próximo pacote ({sobrando})
                </Button>
              )}
              {terminou && <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
