import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation, useSearch, Link } from "wouter";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FaTrophy,
  FaFutbol,
  FaHandshake,
  FaPlus,
  FaFlagCheckered,
  FaHistory,
  FaCog,
  FaCopy,
  FaUsers,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaLayerGroup,
} from "react-icons/fa";
import { TbEdit, TbTrash, TbSettings } from "react-icons/tb";
import { PlayerCardModal } from "@/components/PlayerCardModal";
import { PremioModal } from "@/components/PremioModal";
import { useConfirm } from "@/components/ConfirmDialog";
import { BarChartCard, LeaderBars, Podio, StatTile } from "@/components/Stats";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheGet, cacheSet, invalidateRachaCache } from "@/lib/useRachaCache";
import {
  dataPartida,
  formatarData,
  formatarDataCurta,
  formatarHora,
  iniciais,
  mensagemErro,
  nomeCompleto,
  posicaoLabel,
} from "@/lib/format";
import type { PlayerCardData } from "@/lib/playerRating";

interface Premio {
  id: string;
  nome: string;
  valor_pontos: number;
  ativo: boolean;
}

interface RachaDetailsData {
  id: string;
  nome: string;
  descricao?: string | null;
  codigo_convite: string;
  total_jogadores: number;
  is_admin: boolean;
  ponto_gol: number;
  ponto_assistencia: number;
  ponto_presenca: number;
  premios: Premio[];
  album?: { existe: boolean; pacotes_fechados: number; para_colar: number } | null;
}

interface RankingItem {
  jogador_id: string;
  jogador_nome: string;
  jogador_username: string;
  jogador_imagem_perfil: string;
  posicao: string;
  gols: number;
  assistencias: number;
  presencas: number;
  premios: number;
  premios_pontos: number;
  pontuacao_total: number;
}

interface Partida {
  id: string;
  criado_em: string;
  data_inicio: string | null;
  horario: string | null;
  local: string | null;
  status: boolean;
}

interface Jogador {
  id: string;
  jogador: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    posicao: string;
    imagem_perfil: string | null;
  };
  ativo: boolean;
  data_entrada: string;
}

interface Estatisticas {
  totais: { partidas: number; gols: number; assistencias: number; premios: number; jogadores_ativos: number; media_gols: number };
  por_partida: { partida_id: string; data: string; gols: number; assistencias: number; presentes: number }[];
}

interface Payload {
  racha: RachaDetailsData;
  ranking: RankingItem[];
  partidas: Partida[];
  jogadores: Jogador[];
  estatisticas: Estatisticas;
}

const TABS = ["ranking", "estatisticas", "partidas", "jogadores", "premios"] as const;

function cartaDoRanking(item: RankingItem | undefined, fallback: Jogador["jogador"] | null, rank?: number): PlayerCardData {
  return {
    name: item?.jogador_nome || nomeCompleto(fallback),
    username: item?.jogador_username || fallback?.username,
    position: item?.posicao || fallback?.posicao,
    points: item?.pontuacao_total ?? 0,
    rank,
    stats: {
      matches: item?.presencas ?? 0,
      goals: item?.gols ?? 0,
      assists: item?.assistencias ?? 0,
      awards: item?.premios ?? 0,
    },
    photo: item?.jogador_imagem_perfil || fallback?.imagem_perfil || null,
  };
}

export default function RachaDetails() {
  const [, params] = useRoute("/racha/:id");
  const id = params?.id;
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [confirm, confirmDialog] = useConfirm();

  const tabParam = new URLSearchParams(search).get("tab");
  const activeTab = TABS.includes(tabParam as any) ? (tabParam as string) : "ranking";

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(search);
    newParams.set("tab", value);
    setLocation(`${location}?${newParams.toString()}`, { replace: true });
  };

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [isPremioModalOpen, setPremioModalOpen] = useState(false);
  const [editingPremio, setEditingPremio] = useState<Premio | null>(null);

  const cacheKey = `racha:${id}:all`;

  const fetchData = async () => {
    const [rachaRes, rankingRes, partidasRes, jogadoresRes, statsRes] = await Promise.all([
      api.get(`/rachas/${id}/`),
      api.get(`/rachas/${id}/ranking/`),
      api.get(`/partidas/?racha=${id}`),
      api.get(`/rachas/${id}/jogadores/`),
      api.get(`/rachas/${id}/estatisticas/`),
    ]);
    const lista = (d: any) => (Array.isArray(d) ? d : d?.results || []);
    const payload: Payload = {
      racha: rachaRes.data,
      ranking: rankingRes.data,
      partidas: lista(partidasRes.data),
      jogadores: jogadoresRes.data,
      estatisticas: statsRes.data,
    };
    cacheSet(cacheKey, payload);
    setData(payload);
    setErro(null);
  };

  const recarregar = async () => {
    if (!id) return;
    invalidateRachaCache(id);
    try {
      await fetchData();
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao atualizar dados do racha."));
    }
  };

  useEffect(() => {
    if (!id) return;
    const cached = cacheGet<Payload>(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
    fetchData()
      .catch(error => {
        if (!cached) setErro(error?.response?.status === 404 ? "Racha não encontrado ou você não participa dele." : mensagemErro(error));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rankingPorId = useMemo(() => new Map((data?.ranking ?? []).map((r, i) => [r.jogador_id, { item: r, pos: i + 1 }])), [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full max-w-xl rounded-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data || erro) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="space-y-4 py-10">
          <FaFutbol className="mx-auto text-4xl text-muted-foreground" />
          <p className="font-bold">{erro || "Racha não encontrado."}</p>
          <Link href="/">
            <Button variant="outline">Voltar para Meus Rachas</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { racha, ranking, partidas, jogadores, estatisticas } = data;
  const premios = racha.premios ?? [];

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(racha.codigo_convite);
      toast.success("Código copiado! Envie para a galera.");
    } catch {
      toast.info(`Código do racha: ${racha.codigo_convite}`);
    }
  };

  const handleSavePremio = async (form: { nome: string; valor_pontos: number }) => {
    try {
      if (editingPremio) {
        await api.patch(`/premios/${editingPremio.id}/`, form);
        toast.success("Prêmio atualizado!");
      } else {
        await api.post("/premios/", { ...form, racha: id });
        toast.success("Prêmio criado!");
      }
      fecharPremioModal();
      recarregar();
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao salvar prêmio."));
    }
  };

  const fecharPremioModal = () => {
    setPremioModalOpen(false);
    setEditingPremio(null);
  };

  const handleDeletePremio = async (premio: Premio) => {
    const ok = await confirm({
      title: `Excluir o prêmio "${premio.nome}"?`,
      description: "Os pontos já concedidos com este prêmio também deixam de contar no ranking.",
      confirmText: "Excluir prêmio",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/premios/${premio.id}/`);
      toast.success("Prêmio excluído.");
      recarregar();
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao excluir prêmio."));
    }
  };

  const handleToggleStatus = async (item: Jogador) => {
    try {
      await api.post(`/rachas/${id}/alterar_status_jogador/`, { jogador_id: item.jogador.id, ativo: !item.ativo });
      toast.success(`${nomeCompleto(item.jogador)} ${item.ativo ? "desativado" : "ativado"}.`);
      recarregar();
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao alterar status do jogador."));
    }
  };

  const ativos = jogadores.filter(j => j.ativo);
  const inativos = jogadores.filter(j => !j.ativo);

  const graficoPartidas = estatisticas.por_partida.slice(-12).map(p => ({
    data: formatarDataCurta(p.data),
    gols: p.gols,
    assistencias: p.assistencias,
    presentes: p.presentes,
  }));

  const artilheiros = [...ranking].sort((a, b) => b.gols - a.gols).filter(r => r.gols > 0).slice(0, 5);
  const garcons = [...ranking].sort((a, b) => b.assistencias - a.assistencias).filter(r => r.assistencias > 0).slice(0, 5);

  return (
    <div className="space-y-6">
      {confirmDialog}

      {/* Cabeçalho */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-card p-5 md:p-7" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-2xl font-black tracking-tight md:text-3xl" title={racha.nome}>{racha.nome}</h1>
              {racha.is_admin && <Badge variant="gold" className="shrink-0">Admin</Badge>}
            </div>
            {racha.descricao && <p className="line-clamp-2 max-w-xl break-words text-sm text-muted-foreground" title={racha.descricao}>{racha.descricao}</p>}
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><FaUsers aria-hidden /> {racha.total_jogadores} jogadores</span>
              <span aria-hidden className="hidden sm:inline">•</span>
              <span>Gol {racha.ponto_gol} pt · Assist. {racha.ponto_assistencia} pt · Presença {racha.ponto_presenca} pt</span>
            </div>
            <button
              onClick={copiarCodigo}
              className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-primary/50 bg-primary/10 px-3 py-1 text-sm font-black tracking-widest text-primary transition hover:bg-primary/15"
              aria-label={`Copiar código de convite ${racha.codigo_convite}`}
            >
              {racha.codigo_convite} <FaCopy className="text-xs" aria-hidden />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(racha.album?.existe || racha.is_admin) && (
              <Link href={`/racha/${id}/album`}>
                <Button variant="outline" className="relative">
                  <FaLayerGroup /> Álbum
                  {(racha.album?.pacotes_fechados ?? 0) > 0 && (
                    <span
                      className="absolute -right-2 -top-2 flex min-w-6 items-center justify-center rounded-full border-2 border-card bg-gold px-1.5 text-xs font-black text-black"
                      aria-label={`${racha.album!.pacotes_fechados} pacotes para abrir`}
                    >
                      {racha.album!.pacotes_fechados}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            {racha.is_admin && (
              <>
              <Link href={`/racha/${id}/editar`}>
                <Button variant="outline">
                  <TbSettings /> Configurar
                </Button>
              </Link>
              <Link href={`/racha/${id}/nova-partida`}>
                <Button>
                  <FaFlagCheckered /> Nova Partida
                </Button>
              </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max min-w-full md:min-w-0">
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
            <TabsTrigger value="partidas">Partidas</TabsTrigger>
            <TabsTrigger value="jogadores">Jogadores</TabsTrigger>
            <TabsTrigger value="premios">Prêmios</TabsTrigger>
          </TabsList>
        </div>

        {/* ═══ RANKING ═══ */}
        <TabsContent value="ranking" className="mt-6 space-y-6">
          {ranking.length === 0 ? (
            <EmptyState icon={<FaTrophy />} texto="Nenhum jogador ativo no ranking ainda." />
          ) : (
            <>
              {ranking.some(r => r.pontuacao_total > 0) && (
                <Card>
                  <CardContent className="pt-6">
                    <Podio
                      unidade="pts"
                      itens={ranking.slice(0, 3).map(r => ({
                        id: r.jogador_id,
                        nome: r.jogador_nome,
                        foto: r.jogador_imagem_perfil,
                        valor: r.pontuacao_total,
                        detalhe: `${r.gols} G · ${r.assistencias} A`,
                      }))}
                      wrap={(item, node) => {
                        const info = rankingPorId.get(item.id);
                        return (
                          <PlayerCardModal rachaName={racha.nome} player={cartaDoRanking(info?.item, null, info?.pos)} className="w-full min-w-0">
                            {node}
                          </PlayerCardModal>
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FaTrophy className="text-gold" aria-hidden /> Classificação geral
                  </CardTitle>
                  <CardDescription>Toque em um jogador para ver a carta dele.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border text-left text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                          <th className="w-10 pb-3 pl-4 sm:pl-2">#</th>
                          <th className="pb-3">Jogador</th>
                          <th className="pb-3 text-center" title="Pontos">Pts</th>
                          <th className="hidden pb-3 text-center sm:table-cell" title="Jogos">J</th>
                          <th className="hidden pb-3 text-center sm:table-cell" title="Gols">G</th>
                          <th className="hidden pb-3 text-center sm:table-cell" title="Assistências">A</th>
                          <th className="hidden pb-3 pr-2 text-center md:table-cell" title="Prêmios">Prêm.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.map((item, index) => (
                          <tr key={item.jogador_id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
                            <td className="py-3 pl-4 sm:pl-2">
                              <span
                                className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-black ${
                                  index === 0 ? "bg-gold/20 text-gold" : index === 1 ? "bg-silver/25 text-foreground" : index === 2 ? "bg-bronze/20 text-bronze" : "text-muted-foreground"
                                }`}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td className="w-full max-w-0 py-3">
                              <PlayerCardModal rachaName={racha.nome} player={cartaDoRanking(item, null, index + 1)}>
                                <div className="flex items-center gap-3 pr-2">
                                  <Avatar className="size-10 shrink-0 rounded-full border-2 border-border bg-muted">
                                    <AvatarImage src={item.jogador_imagem_perfil || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-primary/15 text-xs font-black text-primary">
                                      {iniciais(item.jogador_nome)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate font-bold" title={item.jogador_nome}>{item.jogador_nome}</p>
                                    <p className="truncate text-xs font-semibold text-muted-foreground">
                                      <span className="sm:hidden">{item.presencas}J · {item.gols}G · {item.assistencias}A</span>
                                      <span className="hidden sm:inline">{posicaoLabel(item.posicao)}</span>
                                    </p>
                                  </div>
                                </div>
                              </PlayerCardModal>
                            </td>
                            <td className="py-3 text-center text-lg font-black tabular-nums text-primary">{item.pontuacao_total}</td>
                            <td className="hidden py-3 text-center tabular-nums text-muted-foreground sm:table-cell">{item.presencas}</td>
                            <td className="hidden py-3 text-center tabular-nums text-muted-foreground sm:table-cell">{item.gols}</td>
                            <td className="hidden py-3 text-center tabular-nums text-muted-foreground sm:table-cell">{item.assistencias}</td>
                            <td className="hidden py-3 pr-2 text-center tabular-nums text-muted-foreground md:table-cell">{item.premios}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ ESTATÍSTICAS ═══ */}
        <TabsContent value="estatisticas" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Partidas" value={estatisticas.totais.partidas} icon={<FaCalendarAlt />} />
            <StatTile label="Gols" value={estatisticas.totais.gols} hint={`${estatisticas.totais.media_gols} por partida`} icon={<FaFutbol />} />
            <StatTile label="Assistências" value={estatisticas.totais.assistencias} icon={<FaHandshake />} />
            <StatTile label="Jogadores ativos" value={estatisticas.totais.jogadores_ativos} icon={<FaUsers />} />
          </div>

          {graficoPartidas.length === 0 ? (
            <EmptyState icon={<FaFutbol />} texto="As estatísticas aparecem depois da primeira partida." />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Gols e assistências por partida</CardTitle>
                  <CardDescription>Últimas {graficoPartidas.length} partidas</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChartCard
                    ariaLabel="Gráfico de barras com gols e assistências por partida"
                    data={graficoPartidas}
                    xKey="data"
                    series={[
                      { key: "gols", label: "Gols", slot: 1 },
                      { key: "assistencias", label: "Assistências", slot: 2 },
                    ]}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FaFutbol aria-hidden /> Artilheiros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LeaderBars
                      unidade="gols"
                      slot={1}
                      itens={artilheiros.map(r => ({ id: r.jogador_id, nome: r.jogador_nome, valor: r.gols, foto: r.jogador_imagem_perfil }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FaHandshake aria-hidden /> Garçons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LeaderBars
                      unidade="assistências"
                      slot={2}
                      itens={garcons.map(r => ({ id: r.jogador_id, nome: r.jogador_nome, valor: r.assistencias, foto: r.jogador_imagem_perfil }))}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Presença por partida</CardTitle>
                  <CardDescription>Quantos jogadores apareceram em cada jogo</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChartCard
                    ariaLabel="Gráfico de barras com número de presentes por partida"
                    data={graficoPartidas}
                    xKey="data"
                    height={180}
                    series={[{ key: "presentes", label: "Presentes", slot: 3 }]}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ PARTIDAS ═══ */}
        <TabsContent value="partidas" className="mt-6">
          {partidas.length === 0 ? (
            <EmptyState
              icon={<FaFutbol />}
              texto="Nenhuma partida registrada."
              acao={
                racha.is_admin && (
                  <Link href={`/racha/${id}/nova-partida`}>
                    <Button><FaPlus /> Criar primeira partida</Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="grid gap-3">
              {partidas.map(partida => {
                const quando = dataPartida(partida);
                const stats = estatisticas.por_partida.find(p => p.partida_id === partida.id);
                return (
                  <Card key={partida.id} className="transition-colors hover:border-primary/50">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-muted leading-none">
                          <span className="text-xl font-black tabular-nums">{quando ? quando.getDate().toString().padStart(2, "0") : "—"}</span>
                          <span className="text-[10px] font-extrabold uppercase text-muted-foreground">
                            {quando ? quando.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") : ""}
                          </span>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-extrabold">{formatarData(quando, { weekday: "long", day: "2-digit", month: "long", year: undefined })}</span>
                            {partida.status ? (
                              <Badge variant="live"><span className="size-1.5 animate-pulse rounded-full bg-success" /> Em andamento</Badge>
                            ) : (
                              <Badge variant="muted">Encerrada</Badge>
                            )}
                          </div>
                          <p className="flex min-w-0 flex-wrap gap-x-3 text-xs font-semibold text-muted-foreground">
                            {(partida.horario || quando) && <span>{partida.horario || formatarHora(quando)}</span>}
                            {partida.local && <span className="inline-flex min-w-0 max-w-full items-center gap-1" title={partida.local}><FaMapMarkerAlt className="shrink-0" aria-hidden /> <span className="truncate">{partida.local}</span></span>}
                            {stats && <span>{stats.gols} gols · {stats.presentes} presentes</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 justify-end gap-2">
                        <Link href={`/partida/${partida.id}/timeline`}>
                          <Button variant="ghost" size="sm"><FaHistory /> Lances</Button>
                        </Link>
                        {racha.is_admin && (
                          <Link href={`/partida/${partida.id}/gerenciar`}>
                            <Button variant="outline" size="sm"><FaCog /> Gerenciar</Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ JOGADORES ═══ */}
        <TabsContent value="jogadores" className="mt-6 space-y-6">
          {[{ titulo: "Ativos", lista: ativos }, { titulo: "Inativos", lista: inativos }].map(
            grupo =>
              grupo.lista.length > 0 && (
                <section key={grupo.titulo} className="space-y-3">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                    {grupo.titulo} ({grupo.lista.length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {grupo.lista.map(item => {
                      const info = rankingPorId.get(item.jogador.id);
                      return (
                        <Card key={item.id} className={item.ativo ? "" : "opacity-70"}>
                          <CardContent className="flex items-center gap-3 p-4">
                            <PlayerCardModal rachaName={racha.nome} player={cartaDoRanking(info?.item, item.jogador, info?.pos)} className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="size-12 shrink-0 rounded-full border-2 border-border">
                                  <AvatarImage src={item.jogador.imagem_perfil || undefined} className="object-cover" />
                                  <AvatarFallback className="bg-muted font-black">{iniciais(nomeCompleto(item.jogador))}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate font-bold" title={nomeCompleto(item.jogador)}>{nomeCompleto(item.jogador)}</p>
                                  <p className="truncate text-xs font-semibold text-muted-foreground">
                                    {posicaoLabel(item.jogador.posicao)} · desde {formatarData(item.data_entrada)}
                                  </p>
                                </div>
                              </div>
                            </PlayerCardModal>
                            {racha.is_admin && (
                              <div className="ml-auto flex shrink-0 flex-col items-center gap-1">
                                <Switch
                                  checked={item.ativo}
                                  onCheckedChange={() => handleToggleStatus(item)}
                                  aria-label={`${item.ativo ? "Desativar" : "Ativar"} ${nomeCompleto(item.jogador)}`}
                                />
                                <span className="text-[10px] font-bold text-muted-foreground">{item.ativo ? "Ativo" : "Inativo"}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )
          )}
        </TabsContent>

        {/* ═══ PRÊMIOS ═══ */}
        <TabsContent value="premios" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Prêmios dão pontos extras no ranking quando concedidos em uma partida.</p>
            {racha.is_admin && premios.length > 0 && (
              <Button onClick={() => { setEditingPremio(null); setPremioModalOpen(true); }} className="shrink-0">
                <FaPlus /> Novo prêmio
              </Button>
            )}
          </div>

          {premios.length === 0 ? (
            <EmptyState
              icon={<FaTrophy />}
              texto="Nenhum prêmio configurado."
              acao={
                racha.is_admin && (
                  <Button onClick={() => { setEditingPremio(null); setPremioModalOpen(true); }}>
                    <FaPlus /> Criar primeiro prêmio
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {premios.map(premio => (
                <Card key={premio.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                        <FaTrophy aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold" title={premio.nome}>{premio.nome}</p>
                        <p className="text-sm font-semibold text-muted-foreground">+{premio.valor_pontos} pontos</p>
                      </div>
                    </div>
                    {racha.is_admin && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${premio.nome}`} onClick={() => { setEditingPremio(premio); setPremioModalOpen(true); }}>
                          <TbEdit />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Excluir ${premio.nome}`} onClick={() => handleDeletePremio(premio)}>
                          <TbTrash />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <PremioModal
            open={isPremioModalOpen}
            onOpenChange={open => (open ? setPremioModalOpen(true) : fecharPremioModal())}
            onSubmit={handleSavePremio}
            initialData={editingPremio}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon, texto, acao }: { icon: React.ReactNode; texto: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground">{icon}</div>
      <p className="font-bold text-muted-foreground">{texto}</p>
      {acao}
    </div>
  );
}
