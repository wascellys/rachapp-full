import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaFutbol, FaArrowLeft, FaUserPlus, FaFlagCheckered, FaHistory, FaTrophy, FaHandshake, FaUserMinus } from "react-icons/fa";
import { TbSettings, TbTrash } from "react-icons/tb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectPremioModal } from "@/components/SelectPremioModal";
import { MultiSelect } from "@/components/ui/multi-select";
import { useConfirm } from "@/components/ConfirmDialog";
import { invalidateRachaCache } from "@/lib/useRachaCache";
import { dataPartida, formatarData, iniciais, mensagemErro, nomeCompleto, posicaoLabel, primeiroNome } from "@/lib/format";

interface Jogador {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  posicao: string;
  imagem_perfil: string | null;
}

interface JogadorPartida {
  id: string;
  jogador: Jogador;
  presente: boolean;
}

interface Partida {
  id: string;
  racha: string;
  status: boolean;
  data_inicio: string | null;
  criado_em: string;
  local: string | null;
  racha_is_admin: boolean;
  registros: { id: string; jogador_gol: Jogador | null; jogador_assistencia: Jogador | null }[];
  premios_partida: { id: string; jogador: Jogador }[];
}

export default function GerenciarPartida() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/partida/:id/gerenciar");
  const partidaId = params?.id;
  const [confirm, confirmDialog] = useConfirm();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [partida, setPartida] = useState<Partida | null>(null);
  const [jogadoresPartida, setJogadoresPartida] = useState<JogadorPartida[]>([]);
  const [jogadoresDisponiveis, setJogadoresDisponiveis] = useState<Jogador[]>([]);
  const [salvando, setSalvando] = useState(false);

  const [showAddJogador, setShowAddJogador] = useState(false);
  const [showRegistrarGol, setShowRegistrarGol] = useState(false);
  const [showSelectPremio, setShowSelectPremio] = useState(false);
  const [selectedJogadoresIds, setSelectedJogadoresIds] = useState<string[]>([]);
  const [selectedAssistenciaId, setSelectedAssistenciaId] = useState<string>("none");
  const [jogadorGol, setJogadorGol] = useState<JogadorPartida | null>(null);
  const [jogadorPremio, setJogadorPremio] = useState<JogadorPartida | null>(null);

  useEffect(() => {
    if (partidaId) carregarDados(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidaId]);

  const carregarDados = async (inicial = false) => {
    try {
      if (inicial) setLoading(true);
      const [partidaRes, jogadoresPartidaRes] = await Promise.all([
        api.get(`/partidas/${partidaId}/`),
        api.get(`/partidas/${partidaId}/jogadores/`),
      ]);
      const p: Partida = partidaRes.data;
      setPartida(p);

      const presentes: JogadorPartida[] = jogadoresPartidaRes.data;
      presentes.sort((a, b) => nomeCompleto(a.jogador).localeCompare(nomeCompleto(b.jogador)));
      setJogadoresPartida(presentes);

      const todosRes = await api.get(`/rachas/${p.racha}/jogadores/`);
      const idsNaPartida = new Set(presentes.map(jp => String(jp.jogador.id)));
      setJogadoresDisponiveis(
        todosRes.data
          .filter((jr: any) => jr.ativo)
          .map((jr: any) => jr.jogador as Jogador)
          .filter((j: Jogador) => !idsNaPartida.has(String(j.id)))
          .sort((a: Jogador, b: Jogador) => nomeCompleto(a).localeCompare(nomeCompleto(b)))
      );
      setErro(null);
    } catch (error: any) {
      setErro(error?.response?.status === 404 ? "Partida não encontrada." : mensagemErro(error, "Erro ao carregar a partida."));
    } finally {
      setLoading(false);
    }
  };

  // Gols/assistências/prêmios de cada jogador nesta partida
  const resumo = useMemo(() => {
    const mapa = new Map<string, { gols: number; assistencias: number; premios: number }>();
    const get = (id: string) => mapa.get(id) ?? mapa.set(id, { gols: 0, assistencias: 0, premios: 0 }).get(id)!;
    partida?.registros.forEach(r => {
      if (r.jogador_gol) get(r.jogador_gol.id).gols++;
      if (r.jogador_assistencia) get(r.jogador_assistencia.id).assistencias++;
    });
    partida?.premios_partida.forEach(p => get(p.jogador.id).premios++);
    return mapa;
  }, [partida]);

  const aposAlteracao = () => {
    if (partida) invalidateRachaCache(partida.racha);
    carregarDados();
  };

  const adicionarJogador = async () => {
    if (selectedJogadoresIds.length === 0) return;
    setSalvando(true);
    try {
      const res = await api.post(`/partidas/${partidaId}/adicionar_jogador/`, { jogadores_ids: selectedJogadoresIds });
      const adicionados = res.data?.jogadores?.length ?? 0;
      toast.success(`${adicionados} ${adicionados === 1 ? "jogador adicionado" : "jogadores adicionados"}!`);
      (res.data?.erros ?? []).forEach((e: string) => toast.warning(e));
      setShowAddJogador(false);
      setSelectedJogadoresIds([]);
      aposAlteracao();
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao adicionar jogadores."));
    } finally {
      setSalvando(false);
    }
  };

  const removerDaPartida = async (jp: JogadorPartida) => {
    const ok = await confirm({
      title: `Remover ${primeiroNome(jp.jogador)} da partida?`,
      description: "Ele deixa de contar presença nesta partida. Gols já registrados continuam na linha do tempo.",
      confirmText: "Remover",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.post(`/partidas/${partidaId}/registrar_presenca/`, { jogador_id: jp.jogador.id, presente: false });
      toast.success(`${primeiroNome(jp.jogador)} removido da partida.`);
      aposAlteracao();
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao remover jogador."));
    }
  };

  const abrirModalGol = (jogador: JogadorPartida | null) => {
    setJogadorGol(jogador);
    setSelectedAssistenciaId("none");
    setShowRegistrarGol(true);
  };

  const registrarGol = async () => {
    setSalvando(true);
    try {
      const payload: Record<string, string | null> = { jogador_gol_id: jogadorGol ? jogadorGol.jogador.id : null };
      if (selectedAssistenciaId !== "none") payload.jogador_assistencia_id = selectedAssistenciaId;
      await api.post(`/partidas/${partidaId}/registrar_gol/`, payload);
      toast.success(`⚽ Gol de ${jogadorGol ? primeiroNome(jogadorGol.jogador) : "jogador não identificado"}!`);
      setShowRegistrarGol(false);
      aposAlteracao();
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao registrar gol."));
    } finally {
      setSalvando(false);
    }
  };

  const finalizarPartida = async () => {
    const ok = await confirm({
      title: "Finalizar a partida?",
      description: "A partida fica marcada como encerrada. Você ainda poderá corrigir lances pela linha do tempo.",
      confirmText: "Finalizar",
    });
    if (!ok || !partida) return;
    try {
      await api.post(`/partidas/${partidaId}/finalizar/`);
      invalidateRachaCache(partida.racha);
      toast.success("Partida finalizada!");
      setLocation(`/racha/${partida.racha}?tab=partidas`);
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao finalizar partida."));
    }
  };

  const excluirPartida = async () => {
    const ok = await confirm({
      title: "Excluir esta partida?",
      description: "Todos os gols, presenças e prêmios desta partida serão apagados e o ranking será recalculado.",
      confirmText: "Excluir partida",
      destructive: true,
    });
    if (!ok || !partida) return;
    try {
      await api.delete(`/partidas/${partidaId}/`);
      invalidateRachaCache(partida.racha);
      toast.success("Partida excluída.");
      setLocation(`/racha/${partida.racha}?tab=partidas`);
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao excluir partida."));
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-36 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (!partida || erro) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="space-y-4 py-10">
          <p className="font-bold">{erro || "Partida não encontrada."}</p>
          <Link href="/"><Button variant="outline">Voltar</Button></Link>
        </CardContent>
      </Card>
    );
  }

  if (!partida.racha_is_admin) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="space-y-4 py-10">
          <p className="font-bold">Apenas administradores do racha podem gerenciar partidas.</p>
          <Link href={`/partida/${partidaId}/timeline`}><Button>Ver lances da partida</Button></Link>
        </CardContent>
      </Card>
    );
  }

  const emAndamento = partida.status;
  const totalGols = partida.registros.length;
  const totalAssist = partida.registros.filter(r => r.jogador_assistencia).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {confirmDialog}

      <div className="flex items-center justify-between gap-2">
        <Link href={`/racha/${partida.racha}?tab=partidas`}>
          <Button variant="ghost" className="pl-2"><FaArrowLeft /> Voltar</Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/partida/${partidaId}/timeline`}>
            <Button variant="outline"><FaHistory /> <span className="hidden sm:inline">Linha do tempo</span></Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ações da partida"><TbSettings /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuLabel>Ações da partida</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {emAndamento && (
                <DropdownMenuItem onClick={finalizarPartida} className="cursor-pointer font-bold">
                  <FaFlagCheckered className="mr-2" /> Finalizar partida
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer font-bold text-destructive focus:text-destructive" onClick={excluirPartida}>
                <TbTrash className="mr-2" /> Excluir partida
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Placar */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-card p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-2xl font-black">Partida de {formatarData(dataPartida(partida))}</h1>
              {emAndamento ? (
                <Badge variant="live"><span className="size-1.5 animate-pulse rounded-full bg-success" /> Ao vivo</Badge>
              ) : (
                <Badge variant="muted">Encerrada</Badge>
              )}
            </div>
            {partida.local && <p className="truncate text-sm font-semibold text-muted-foreground" title={partida.local}>{partida.local}</p>}
          </div>
          <div className="flex gap-6">
            {[
              { label: "Gols", valor: totalGols },
              { label: "Assist.", valor: totalAssist },
              { label: "Presentes", valor: jogadoresPartida.length },
            ].map(i => (
              <div key={i.label} className="text-center">
                <p className="text-3xl font-black tabular-nums">{i.valor}</p>
                <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{i.label}</p>
              </div>
            ))}
          </div>
        </div>
        {!emAndamento && (
          <p className="mt-4 rounded-2xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
            Esta partida foi encerrada. Para corrigir um lance, use a linha do tempo.
          </p>
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl">Jogadores presentes</CardTitle>
          {emAndamento && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button size="sm" variant="outline" onClick={() => abrirModalGol(null)} className="flex-1 border-dashed sm:flex-none">
                <FaFutbol /> Gol não identificado
              </Button>
              <Button size="sm" onClick={() => setShowAddJogador(true)} className="flex-1 sm:flex-none" disabled={jogadoresDisponiveis.length === 0}>
                <FaUserPlus /> Adicionar jogadores
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {jogadoresPartida.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-bold text-muted-foreground">Nenhum jogador na partida ainda.</p>
              {emAndamento && (
                <Button onClick={() => setShowAddJogador(true)}><FaUserPlus /> Adicionar quem veio</Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {jogadoresPartida.map(jp => {
                const r = resumo.get(jp.jogador.id);
                return (
                  <li key={jp.id} className="flex items-center gap-3 rounded-2xl border-2 border-border bg-muted/30 p-3 transition-colors hover:border-primary/40">
                    <Avatar className="size-11 shrink-0 rounded-full">
                      <AvatarImage src={jp.jogador.imagem_perfil || undefined} className="object-cover" />
                      <AvatarFallback className="bg-muted font-black">{iniciais(nomeCompleto(jp.jogador))}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold" title={nomeCompleto(jp.jogador)}>{nomeCompleto(jp.jogador)}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-bold text-muted-foreground">
                        <span>{posicaoLabel(jp.jogador.posicao)}</span>
                        {r?.gols ? <span className="inline-flex items-center gap-1 text-foreground"><FaFutbol aria-hidden /> {r.gols} {r.gols === 1 ? "gol" : "gols"}</span> : null}
                        {r?.assistencias ? <span className="inline-flex items-center gap-1 text-foreground"><FaHandshake aria-hidden /> {r.assistencias} assist.</span> : null}
                        {r?.premios ? <span className="inline-flex items-center gap-1 text-gold"><FaTrophy aria-hidden /> {r.premios}</span> : null}
                      </div>
                    </div>
                    {emAndamento && (
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="icon" variant="outline" onClick={() => { setJogadorPremio(jp); setShowSelectPremio(true); }} aria-label={`Dar prêmio para ${primeiroNome(jp.jogador)}`} title="Dar prêmio">
                          <FaTrophy className="text-gold" />
                        </Button>
                        <Button size="icon" onClick={() => abrirModalGol(jp)} aria-label={`Registrar gol de ${primeiroNome(jp.jogador)}`} title="Registrar gol">
                          <FaFutbol />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removerDaPartida(jp)} aria-label={`Remover ${primeiroNome(jp.jogador)} da partida`} title="Remover da partida">
                          <FaUserMinus />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar Jogador */}
      <Dialog open={showAddJogador} onOpenChange={setShowAddJogador}>
        <DialogContent className="overflow-visible">
          <DialogHeader>
            <DialogTitle>Adicionar jogadores à partida</DialogTitle>
            <DialogDescription>Selecione quem está presente hoje.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <MultiSelect
              options={jogadoresDisponiveis.map(j => ({ value: j.id, label: nomeCompleto(j) }))}
              selected={selectedJogadoresIds}
              onChange={setSelectedJogadoresIds}
              placeholder="Selecione os jogadores..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddJogador(false)}>Cancelar</Button>
            <Button onClick={adicionarJogador} disabled={selectedJogadoresIds.length === 0 || salvando}>
              {salvando ? "Adicionando..." : `Adicionar${selectedJogadoresIds.length ? ` (${selectedJogadoresIds.length})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Gol */}
      <Dialog open={showRegistrarGol} onOpenChange={setShowRegistrarGol}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar gol</DialogTitle>
            <DialogDescription>
              Gol de <strong>{jogadorGol ? nomeCompleto(jogadorGol.jogador) : "jogador não identificado"}</strong>. Quem deu a assistência?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-bold">Assistência (opcional)</label>
            <Select value={selectedAssistenciaId} onValueChange={setSelectedAssistenciaId}>
              <SelectTrigger><SelectValue placeholder="Sem assistência" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem assistência / jogada individual</SelectItem>
                {jogadoresPartida
                  .filter(jp => !jogadorGol || jp.jogador.id !== jogadorGol.jogador.id)
                  .map(jp => (
                    <SelectItem key={jp.jogador.id} value={jp.jogador.id}>{nomeCompleto(jp.jogador)}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegistrarGol(false)}>Cancelar</Button>
            <Button onClick={registrarGol} disabled={salvando}><FaFutbol /> {salvando ? "Salvando..." : "Confirmar gol"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {jogadorPremio && (
        <SelectPremioModal
          open={showSelectPremio}
          onOpenChange={setShowSelectPremio}
          rachaId={partida.racha}
          jogadorId={jogadorPremio.jogador.id}
          jogadorNome={nomeCompleto(jogadorPremio.jogador)}
          partidaId={partidaId!}
          onSuccess={aposAlteracao}
        />
      )}
    </div>
  );
}
