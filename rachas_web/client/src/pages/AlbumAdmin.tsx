import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { FaArrowLeft, FaBoxOpen, FaHistory, FaLayerGroup, FaMagic, FaPaperPlane, FaSearch, FaSlidersH, FaUserPlus } from "react-icons/fa";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatTile } from "@/components/Stats";
import { useConfirm } from "@/components/ConfirmDialog";
import { TIER_THEME } from "@/lib/playerRating";
import {
  PESOS_PADRAO,
  RARIDADES,
  RARIDADE_TIER,
  estimarPacotes,
  percentuais,
  sugerirFigurinhasPorPacote,
  type AlbumInfo,
  type JogadorAlbum,
  type Pesos,
  type Raridade,
} from "@/lib/album";
import { formatarData, iniciais, mensagemErro, posicaoLabel } from "@/lib/format";
import { invalidateRachaCache } from "@/lib/useRachaCache";

interface Membro extends JogadorAlbum {
  ativo: boolean;
  tem_pagina: boolean;
  pacotes_fechados: number;
  coladas: number;
  percentual: number;
}

interface Painel {
  album: AlbumInfo;
  metricas: {
    paginas: number;
    figurinhas: number;
    pacotes_enviados: number;
    pacotes_abertos: number;
    pacotes_fechados: number;
    figurinhas_distribuidas: number;
    colecionadores: number;
    media_conclusao: number;
    albuns_completos: number;
    obtidas_por_raridade: Record<Raridade, number>;
  };
  membros: Membro[];
  sem_pagina: Membro[];
  envios: {
    id: string;
    criado_em: string;
    motivo: string;
    enviado_por: string | null;
    pacotes_por_jogador: number;
    figurinhas_por_pacote: number;
    destinatarios: number;
    pacotes_total: number;
    pacotes_abertos: number;
  }[];
  partidas: { id: string; data: string; status: boolean; presentes_ids: string[] }[];
}

type Destino = "todos" | "partida" | "escolher";

export default function AlbumAdmin() {
  const [, params] = useRoute("/racha/:id/album/gerenciar");
  const id = params?.id!;
  const [, setLocation] = useLocation();
  const [confirm, confirmDialog] = useConfirm();

  const [estado, setEstado] = useState<"carregando" | "sem-album" | "ok" | "erro">("carregando");
  const [erro, setErro] = useState("");
  const [painel, setPainel] = useState<Painel | null>(null);
  const [rachaNome, setRachaNome] = useState("");
  const [membrosAtivos, setMembrosAtivos] = useState(0);

  const carregar = async () => {
    try {
      const res = await api.get(`/rachas/${id}/album/`);
      setRachaNome(res.data.racha_nome);
      if (!res.data.is_admin) {
        setErro("Apenas administradores do racha podem gerenciar o álbum.");
        setEstado("erro");
        return;
      }
      if (!res.data.existe) {
        const jogadores = await api.get(`/rachas/${id}/jogadores/`);
        setMembrosAtivos(jogadores.data.filter((j: any) => j.ativo).length);
        setEstado("sem-album");
        return;
      }
      const p = await api.get<Painel>(`/rachas/${id}/album/painel/`);
      setPainel(p.data);
      setEstado("ok");
    } catch (error: any) {
      setErro(error?.response?.status === 404 ? "Racha não encontrado." : mensagemErro(error));
      setEstado("erro");
    }
  };

  useEffect(() => {
    if (id) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const voltar = (
    <Link href={`/racha/${id}/album`} className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
      <FaArrowLeft className="shrink-0" aria-hidden /> <span className="truncate">Voltar ao álbum{rachaNome ? ` · ${rachaNome}` : ""}</span>
    </Link>
  );

  if (estado === "carregando") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (estado === "erro") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="space-y-4 py-10">
          <p className="font-bold">{erro}</p>
          <Link href={`/racha/${id}`}><Button variant="outline">Voltar ao racha</Button></Link>
        </CardContent>
      </Card>
    );
  }

  if (estado === "sem-album") {
    return (
      <div className="space-y-6">
        {confirmDialog}
        {voltar}
        <CriarAlbum
          rachaNome={rachaNome}
          membrosAtivos={membrosAtivos}
          onCriar={async dados => {
            try {
              await api.post(`/rachas/${id}/album/`, dados);
              toast.success("Álbum criado!");
              invalidateRachaCache(id);
              setEstado("carregando");
              await carregar();
            } catch (error) {
              toast.error(mensagemErro(error, "Não foi possível criar o álbum."));
            }
          }}
        />
      </div>
    );
  }

  const { album, metricas } = painel!;
  const totalObtidas = RARIDADES.reduce((s, r) => s + metricas.obtidas_por_raridade[r], 0);

  return (
    <div className="space-y-6">
      {confirmDialog}
      {voltar}

      <section className="rounded-3xl border-2 border-border bg-card p-5 md:p-7" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Gerenciar álbum</p>
        <h1 className="truncate text-2xl font-black tracking-tight md:text-3xl" title={album.titulo}>{album.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          Criado em {formatarData(album.criado_em)}. Pacotes e figurinhas não alteram o ranking nem a pontuação do racha.
        </p>
      </section>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Páginas" value={metricas.paginas} hint={`${metricas.figurinhas} figurinhas`} />
        <StatTile label="Pacotes enviados" value={metricas.pacotes_enviados} />
        <StatTile label="Abertos" value={metricas.pacotes_abertos} hint={`${metricas.pacotes_fechados} fechados`} />
        <StatTile label="Colecionando" value={metricas.colecionadores} hint="com 1+ colada" />
        <StatTile label="Média do álbum" value={`${metricas.media_conclusao}%`} hint="entre colecionadores" />
        <StatTile label="Álbuns completos" value={metricas.albuns_completos} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <DistribuirPacotes painel={painel!} rachaId={id} confirm={confirm} onEnviado={carregar} />
          <Historico envios={painel!.envios} />
        </div>
        <div className="min-w-0 space-y-6">
          <PaginasPendentes rachaId={id} pendentes={painel!.sem_pagina} onGeradas={carregar} />
          <ChancesRaridade rachaId={id} album={album} onSalvo={carregar} />
          {totalObtidas > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Figurinhas que já saíram</CardTitle>
                <CardDescription>{totalObtidas} no total, por raridade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {RARIDADES.map(r => {
                  const n = metricas.obtidas_por_raridade[r];
                  const t = TIER_THEME[RARIDADE_TIER[r]];
                  return (
                    <div key={r}>
                      <div className="flex items-baseline justify-between text-sm font-bold">
                        <span>{t.label}</span>
                        <span className="tabular-nums">{n} <span className="text-xs text-muted-foreground">({Math.round((n * 100) / totalObtidas)}%)</span></span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${(n * 100) / totalObtidas}%`, background: t.frame }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MembrosAlbum membros={painel!.membros} />

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setLocation(`/racha/${id}/album`)}>
          <FaLayerGroup /> Ver o álbum como jogador
        </Button>
      </div>
    </div>
  );
}

/* ─── Criar álbum ─── */
function CriarAlbum({
  rachaNome,
  membrosAtivos,
  onCriar,
}: {
  rachaNome: string;
  membrosAtivos: number;
  onCriar: (dados: { titulo: string; pesos: Pesos; gerar_paginas: boolean }) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(`Álbum ${rachaNome}`);
  const [pesos, setPesos] = useState<Pesos>(PESOS_PADRAO);
  const [gerarPaginas, setGerarPaginas] = useState(true);
  const [salvando, setSalvando] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FaMagic className="text-primary" aria-hidden /> Criar álbum de figurinhas</CardTitle>
        <CardDescription>
          Cada jogador ganha uma página com 4 figurinhas: Bronze, Prata, Ouro e Lenda. Depois você distribui pacotes quando quiser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="titulo-album">Nome do álbum</Label>
          <Input id="titulo-album" value={titulo} maxLength={120} onChange={e => setTitulo(e.target.value)} />
        </div>
        <EditorPesos pesos={pesos} onChange={setPesos} />
        <label className="flex items-start gap-3 rounded-2xl border-2 border-border p-3">
          <Checkbox checked={gerarPaginas} onCheckedChange={v => setGerarPaginas(v === true)} className="mt-0.5" />
          <span className="text-sm">
            <strong>Criar páginas para os {membrosAtivos} membros ativos agora</strong>
            <span className="block text-muted-foreground">Quem entrar depois aparece em "Jogadores sem página" no painel.</span>
          </span>
        </label>
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={salvando}
          onClick={async () => {
            setSalvando(true);
            await onCriar({ titulo, pesos, gerar_paginas: gerarPaginas });
            setSalvando(false);
          }}
        >
          <FaMagic /> {salvando ? "Criando..." : "Criar álbum"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Pesos de raridade ─── */
function EditorPesos({ pesos, onChange }: { pesos: Pesos; onChange: (p: Pesos) => void }) {
  const pct = percentuais(pesos);
  return (
    <div className="@container space-y-2">
      <Label>Chance de cada raridade sair</Label>
      <div className="grid grid-cols-2 gap-3 @xl:grid-cols-4">
        {RARIDADES.map(r => {
          const t = TIER_THEME[RARIDADE_TIER[r]];
          return (
            <div key={r} className="rounded-2xl border-2 border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ background: t.frame }} aria-hidden />
                <span className="truncate text-sm font-extrabold">{t.label}</span>
              </div>
              <Input
                type="number"
                min={0}
                max={1000}
                inputMode="numeric"
                value={pesos[r]}
                aria-label={`Peso da raridade ${t.label}`}
                onChange={e => onChange({ ...pesos, [r]: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) })}
              />
              <p className="mt-1 text-xs font-bold tabular-nums text-muted-foreground">{pct[r].toFixed(1)}% por figurinha</p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        São pesos relativos: o padrão 60/28/10/2 significa que, em cada figurinha sorteada, há 2% de chance de ser Lenda.
      </p>
    </div>
  );
}

function ChancesRaridade({ rachaId, album, onSalvo }: { rachaId: string; album: AlbumInfo; onSalvo: () => void }) {
  const [pesos, setPesos] = useState<Pesos>(album.pesos);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setPesos(album.pesos), [album.pesos]);
  const alterado = RARIDADES.some(r => pesos[r] !== album.pesos[r]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FaSlidersH aria-hidden /> Raridades</CardTitle>
        <CardDescription>Vale para os próximos pacotes abertos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <EditorPesos pesos={pesos} onChange={setPesos} />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!alterado || salvando}
            onClick={async () => {
              setSalvando(true);
              try {
                await api.patch(`/rachas/${rachaId}/album/`, { pesos });
                toast.success("Chances atualizadas.");
                onSalvo();
              } catch (error) {
                toast.error(mensagemErro(error, "Não foi possível salvar."));
              } finally {
                setSalvando(false);
              }
            }}
          >
            Salvar chances
          </Button>
          <Button variant="ghost" onClick={() => setPesos(PESOS_PADRAO)}>Restaurar padrão</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Páginas pendentes ─── */
function PaginasPendentes({ rachaId, pendentes, onGeradas }: { rachaId: string; pendentes: Membro[]; onGeradas: () => void }) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setSelecionados(pendentes.map(p => p.id)), [pendentes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FaUserPlus aria-hidden /> Jogadores sem página</CardTitle>
        <CardDescription>Membros ativos que entraram depois da criação do álbum.</CardDescription>
      </CardHeader>
      <CardContent>
        {pendentes.length === 0 ? (
          <p className="text-sm font-semibold text-muted-foreground">Todos os membros ativos já têm página. 👍</p>
        ) : (
          <div className="space-y-3">
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {pendentes.map(m => (
                <li key={m.id}>
                  <label className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/50">
                    <Checkbox
                      checked={selecionados.includes(m.id)}
                      onCheckedChange={v => setSelecionados(s => (v === true ? [...s, m.id] : s.filter(x => x !== m.id)))}
                    />
                    <JogadorLinha jogador={m} />
                  </label>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              disabled={selecionados.length === 0 || salvando}
              onClick={async () => {
                setSalvando(true);
                try {
                  const res = await api.post(`/rachas/${rachaId}/album/paginas/`, { jogadores_ids: selecionados });
                  toast.success(`${res.data.criadas} ${res.data.criadas === 1 ? "página criada" : "páginas criadas"}.`);
                  onGeradas();
                } catch (error) {
                  toast.error(mensagemErro(error, "Não foi possível criar as páginas."));
                } finally {
                  setSalvando(false);
                }
              }}
            >
              <FaUserPlus /> Gerar {selecionados.length} {selecionados.length === 1 ? "página" : "páginas"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Distribuir pacotes ─── */
function DistribuirPacotes({
  painel,
  rachaId,
  confirm,
  onEnviado,
}: {
  painel: Painel;
  rachaId: string;
  confirm: ReturnType<typeof useConfirm>[0];
  onEnviado: () => void;
}) {
  const ativos = painel.membros.filter(m => m.ativo);
  const sugestao = sugerirFigurinhasPorPacote(painel.album.total_paginas);
  const [destino, setDestino] = useState<Destino>("todos");
  const [partidaId, setPartidaId] = useState(painel.partidas[0]?.id ?? "");
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [pacotesPorJogador, setPacotesPorJogador] = useState(1);
  const [figurinhasPorPacote, setFigurinhasPorPacote] = useState(sugestao);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const idsAtivos = new Set(ativos.map(m => m.id));
  const partida = painel.partidas.find(p => p.id === partidaId);
  const destinatarios =
    destino === "todos"
      ? ativos.map(m => m.id)
      : destino === "partida"
        ? (partida?.presentes_ids ?? []).filter(i => idsAtivos.has(i))
        : escolhidos;

  const estimativa = useMemo(
    () => estimarPacotes(painel.album.total_paginas, painel.album.pesos, figurinhasPorPacote),
    [painel.album.total_paginas, painel.album.pesos, figurinhasPorPacote],
  );
  const porPacote = percentuais(painel.album.pesos);
  const filtrados = ativos.filter(m => `${m.nome} ${m.username}`.toLowerCase().includes(busca.trim().toLowerCase()));

  const enviar = async () => {
    const total = destinatarios.length * pacotesPorJogador;
    const ok = await confirm({
      title: `Enviar ${total} ${total === 1 ? "pacote" : "pacotes"}?`,
      description: `${destinatarios.length} ${destinatarios.length === 1 ? "jogador recebe" : "jogadores recebem"} ${pacotesPorJogador} ${pacotesPorJogador === 1 ? "pacote" : "pacotes"} de ${figurinhasPorPacote} figurinhas. Não dá para desfazer.`,
      confirmText: "Enviar pacotes",
    });
    if (!ok) return;
    setEnviando(true);
    try {
      const corpo: Record<string, unknown> = {
        pacotes_por_jogador: pacotesPorJogador,
        figurinhas_por_pacote: figurinhasPorPacote,
        motivo: motivo.trim(),
      };
      if (destino === "todos") corpo.todos = true;
      else corpo.jogadores_ids = destinatarios;
      const res = await api.post(`/rachas/${rachaId}/album/pacotes/`, corpo);
      toast.success(`${res.data.pacotes} pacotes enviados para ${res.data.destinatarios} jogadores!`);
      setMotivo("");
      setEscolhidos([]);
      onEnviado();
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível enviar os pacotes."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FaBoxOpen className="text-primary" aria-hidden /> Distribuir pacotes</CardTitle>
        <CardDescription>Envie depois de cada partida, como recompensa ou em datas especiais.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Destinatários */}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-bold">Quem recebe</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {([
              ["todos", "Todos os ativos", `${ativos.length} jogadores`],
              ["partida", "Por partida", painel.partidas.length ? "Só quem jogou" : "Sem partidas"],
              ["escolher", "Escolher", "Seleção manual"],
            ] as [Destino, string, string][]).map(([valor, titulo, sub]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={destino === valor}
                disabled={valor === "partida" && painel.partidas.length === 0}
                onClick={() => setDestino(valor)}
                className={`min-w-0 rounded-2xl border-2 p-3 text-left transition-colors disabled:opacity-50 ${
                  destino === valor ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <span className="block truncate text-sm font-extrabold">{titulo}</span>
                <span className="block truncate text-xs font-semibold text-muted-foreground">{sub}</span>
              </button>
            ))}
          </div>

          {destino === "partida" && (
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="partida-pacotes">Partida</Label>
              <select
                id="partida-pacotes"
                value={partidaId}
                onChange={e => setPartidaId(e.target.value)}
                className="h-11 w-full min-w-0 rounded-xl border-2 border-input bg-background px-3 text-sm font-semibold"
              >
                {painel.partidas.map(p => (
                  <option key={p.id} value={p.id}>
                    {formatarData(p.data)} · {p.presentes_ids.length} presentes{p.status ? " (em andamento)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {destino === "escolher" && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden />
                  <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar jogador" className="pl-9" aria-label="Buscar jogador" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEscolhidos(Array.from(new Set([...escolhidos, ...filtrados.map(m => m.id)])))}>Todos</Button>
                <Button variant="ghost" size="sm" onClick={() => setEscolhidos([])}>Limpar</Button>
              </div>
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border-2 border-border p-1">
                {filtrados.map(m => (
                  <li key={m.id}>
                    <label className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/50">
                      <Checkbox
                        checked={escolhidos.includes(m.id)}
                        onCheckedChange={v => setEscolhidos(s => (v === true ? [...s, m.id] : s.filter(x => x !== m.id)))}
                      />
                      <JogadorLinha jogador={m} extra={m.pacotes_fechados ? `${m.pacotes_fechados} fechado(s)` : undefined} />
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </fieldset>

        {/* Quantidades */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pacotes-por-jogador">Pacotes por jogador</Label>
            <Input id="pacotes-por-jogador" type="number" min={1} max={20} value={pacotesPorJogador}
              onChange={e => setPacotesPorJogador(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="figurinhas-por-pacote">Figurinhas por pacote</Label>
            <Input id="figurinhas-por-pacote" type="number" min={1} max={30} value={figurinhasPorPacote}
              onChange={e => setFigurinhasPorPacote(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
            {figurinhasPorPacote !== sugestao && (
              <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setFigurinhasPorPacote(sugestao)}>
                Usar sugestão: {sugestao} (≈ páginas ÷ 4)
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="motivo-pacote">Motivo (aparece para o jogador)</Label>
          <Input id="motivo-pacote" value={motivo} maxLength={120} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: Rodada de 02/10" />
        </div>

        {/* Ajuda para escolher */}
        <div className="space-y-3 rounded-2xl bg-muted/50 p-4 text-sm">
          <p className="font-extrabold">O que esperar de cada pacote de {figurinhasPorPacote}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {RARIDADES.map(r => (
              <span key={r} className="font-semibold">
                <span className="tabular-nums font-black">{((porPacote[r] / 100) * figurinhasPorPacote).toFixed(1)}</span>{" "}
                {TIER_THEME[RARIDADE_TIER[r]].label}
              </span>
            ))}
          </div>
          <p className="font-extrabold">Pacotes que um jogador precisa abrir, sozinho e sem trocas</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {estimativa.metas.map(m => (
              <div key={m.meta} className="rounded-xl bg-card p-2">
                <div className="text-xs font-bold text-muted-foreground">{m.meta * 100}%</div>
                <div className="text-lg font-black tabular-nums">{m.pacotes ?? "—"}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Estimativa por simulação com {painel.album.total_paginas} páginas. Uma boa meta é o jogador frequente chegar perto de 50% na temporada; o resto vem das trocas.
            {estimativa.alcancavel < estimativa.total && " Raridades com chance 0 nunca saem, então o álbum não fecha."}
          </p>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 border-t-2 border-border pt-4 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-muted-foreground">
            <strong className="text-foreground">{destinatarios.length * pacotesPorJogador}</strong> pacotes para{" "}
            <strong className="text-foreground">{destinatarios.length}</strong> {destinatarios.length === 1 ? "jogador" : "jogadores"}
          </p>
          <Button size="lg" disabled={destinatarios.length === 0 || enviando} onClick={enviar}>
            <FaPaperPlane /> {enviando ? "Enviando..." : "Enviar pacotes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Histórico ─── */
function Historico({ envios }: { envios: Painel["envios"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FaHistory aria-hidden /> Envios recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {envios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pacote enviado ainda.</p>
        ) : (
          <ul className="divide-y-2 divide-border">
            {envios.map(e => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-bold" title={e.motivo || "Envio sem motivo"}>{e.motivo || "Envio sem motivo"}</p>
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {formatarData(e.criado_em)} · {e.destinatarios} jogadores · {e.pacotes_por_jogador}×{e.figurinhas_por_pacote}
                    {e.enviado_por ? ` · por ${e.enviado_por}` : ""}
                  </p>
                </div>
                <Badge variant={e.pacotes_abertos === e.pacotes_total ? "success" : "outline"} className="shrink-0 tabular-nums">
                  {e.pacotes_abertos}/{e.pacotes_total} abertos
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Membros ─── */
function MembrosAlbum({ membros }: { membros: Membro[] }) {
  const [busca, setBusca] = useState("");
  const lista = membros
    .filter(m => `${m.nome} ${m.username}`.toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a, b) => b.coladas - a.coladas);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso dos jogadores</CardTitle>
        <CardDescription>Quem tem pacotes parados ainda não abriu o app desde o último envio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative sm:max-w-xs">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar jogador" className="pl-9" aria-label="Buscar jogador" />
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {lista.map(m => (
            <li key={m.id} className={`flex items-center gap-3 rounded-2xl border-2 border-border p-3 ${m.ativo ? "" : "opacity-60"}`}>
              <JogadorLinha jogador={m} />
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-black tabular-nums">{m.percentual}%</span>
                {m.pacotes_fechados > 0 ? (
                  <Badge variant="warning">{m.pacotes_fechados} fechado{m.pacotes_fechados > 1 ? "s" : ""}</Badge>
                ) : !m.tem_pagina ? (
                  <Badge variant="muted">Sem página</Badge>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function JogadorLinha({ jogador, extra }: { jogador: JogadorAlbum; extra?: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar className="size-9 shrink-0 rounded-full">
        <AvatarImage src={jogador.imagem_perfil || undefined} className="object-cover" />
        <AvatarFallback className="bg-muted text-xs font-black">{iniciais(jogador.nome)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" title={jogador.nome}>{jogador.nome}</p>
        <p className="truncate text-xs font-semibold text-muted-foreground">
          {posicaoLabel(jogador.posicao)}
          {extra ? ` · ${extra}` : ""}
        </p>
      </div>
    </div>
  );
}
