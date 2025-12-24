import { useEffect, useState } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FaTrophy,
  FaUsers,
  FaFutbol,
  FaHandshake,
  FaPlus,
  FaFlagCheckered,
  FaThLarge,
  FaList,
  FaHistory,
  FaCog,
} from "react-icons/fa";
import { TbEdit, TbTrash, TbSettings } from "react-icons/tb";
import { PlayerCardModal } from "@/components/PlayerCardModal";
import { Link } from "wouter";
import { PremioModal } from "@/components/PremioModal";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface RachaDetails {
  id: string;
  nome: string;
  codigo_convite: string;
  total_jogadores: number;
  is_admin: boolean;
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
  pontuacao_total: number;
}

interface Partida {
  id: string;
  criado_em: string;
  horario: string;
  local: string;
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

interface Premio {
  id: string;
  nome: string;
  valor_pontos: number;
  ativo: boolean;
}

export default function RachaDetails() {
  const [, params] = useRoute("/racha/:id");
  const id = params?.id;
  const [location, setLocation] = useLocation();
  const search = useSearch();

  const queryParams = new URLSearchParams(search);
  const activeTab = queryParams.get("tab") || "ranking";

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(search);
    newParams.set("tab", value);
    // Usamos replace: true para não poluir o histórico do navegador com cada mudança de aba
    setLocation(`${location}?${newParams.toString()}`, { replace: true });
  };

  const [racha, setRacha] = useState<RachaDetails | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [partidasViewMode, setPartidasViewMode] = useState<"grid" | "list">(
    "grid"
  );
  const [premiosViewMode, setPremiosViewMode] = useState<"grid" | "list">(
    "grid"
  );
  
  const [isPremioModalOpen, setPremioModalOpen] = useState(false);
  const [editingPremio, setEditingPremio] = useState<Premio | null>(null);

  const fetchPremios = async () => {
    try {
      const premiosRes = await api.get(`/premios/`);
      const premiosData = Array.isArray(premiosRes.data)
        ? premiosRes.data
        : premiosRes.data.results || [];
      const premiosRacha = premiosData.filter((p: any) => p.racha === id);
      setPremios(premiosRacha);
    } catch (error) {
      console.error("Erro ao recarregar prêmios:", error);
    }
  };

  const handleSavePremio = async (data: { nome: string; valor_pontos: number }) => {
    try {
      if (editingPremio) {
        await api.patch(`/premios/${editingPremio.id}/`, data);
        toast.success("Prêmio atualizado com sucesso!");
      } else {
        await api.post("/premios/", { ...data, racha: id });
        toast.success("Prêmio criado com sucesso!");
      }
      setPremioModalOpen(false);
      setEditingPremio(null);
      fetchPremios();
    } catch (error) {
      console.error("Erro ao salvar prêmio:", error);
      toast.error("Erro ao salvar prêmio.");
    }
  };

  const handleEditPremio = (premio: Premio) => {
    setEditingPremio(premio);
    setPremioModalOpen(true);
  };

  const handleDeletePremio = async (premio: Premio) => {
    if (!confirm(`Tem certeza que deseja excluir o prêmio "${premio.nome}"?`)) {
      return;
    }

    try {
      await api.delete(`/premios/${premio.id}/`);
      toast.success("Prêmio excluído com sucesso!");
      fetchPremios();
    } catch (error) {
      console.error("Erro ao excluir prêmio:", error);
      toast.error("Erro ao excluir prêmio.");
    }
  };

  const handleToggleStatus = async (jogadorRachaId: string, currentStatus: boolean, jogadorId: string) => {
    try {
      await api.post(`/rachas/${id}/alterar_status_jogador/`, {
        jogador_id: jogadorId,
        ativo: !currentStatus,
      });
      
      toast.success(`Jogador ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      
      // Atualizar lista localmente para refletir a mudança
      const fetchData = async () => {
         const [rankingRes, jogadoresRes] = await Promise.all([
             api.get(`/rachas/${id}/ranking/`),
             api.get(`/rachas/${id}/jogadores/`)
         ]);
         setRanking(rankingRes.data);
         setJogadores(jogadoresRes.data);
      };
      fetchData();
      
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do jogador.");
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [rachaRes, rankingRes, partidasRes, jogadoresRes, premiosRes] =
          await Promise.all([
            api.get(`/rachas/${id}/`),
            api.get(`/rachas/${id}/ranking/`),
            api.get(`/partidas/`), // Ajustar filtro no backend se necessário, ou filtrar aqui
            api.get(`/rachas/${id}/jogadores/`),
            api.get(`/premios/`), // Ajustar filtro no backend se necessário
          ]);

        setRacha(rachaRes.data);
        setRanking(rankingRes.data);

        // Filtrar partidas deste racha (lidando com paginação se necessário)
        const partidasData = Array.isArray(partidasRes.data)
          ? partidasRes.data
          : partidasRes.data.results || [];
        const partidasRacha = partidasData.filter((p: any) => p.racha === id);
        setPartidas(partidasRacha);

        setJogadores(jogadoresRes.data);

        // Filtrar prêmios deste racha (lidando com paginação se necessário)
        const premiosData = Array.isArray(premiosRes.data)
          ? premiosRes.data
          : premiosRes.data.results || [];
        const premiosRacha = premiosData.filter((p: any) => p.racha === id);
        setPremios(premiosRacha);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
           <Skeleton className="h-8 w-1/3" />
           <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="space-y-4">
           <Skeleton className="h-10 w-full" />
           <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (!racha)
    return <div className="p-8 text-center">Racha não encontrado</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{racha.nome}</h1>
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                #{racha.codigo_convite}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {racha.total_jogadores} Jogadores
            </p>
          </div>
          {racha.is_admin && (
            <div className="flex gap-2">
              <Link href={`/racha/${id}/editar`}>
                <Button variant="outline">
                  <TbSettings className="mr-2" /> Configurar
                </Button>
              </Link>
              <Link href={`/racha/${id}/nova-partida`}>
                <Button>
                  <FaFlagCheckered className="mr-2" /> Nova Partida
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="partidas">Partidas</TabsTrigger>
          <TabsTrigger value="jogadores">Jogadores</TabsTrigger>
          <TabsTrigger value="premios">Prêmios</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaTrophy className="text-yellow-500" /> Classificação Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted-foreground">
                      <th className="pb-3 pl-2">#</th>
                      <th className="pb-3">Jogador</th>
                      <th className="pb-3 text-center">Pts</th>
                      <th className="pb-3 text-center hidden sm:table-cell">
                        J
                      </th>
                      <th className="pb-3 text-center hidden sm:table-cell">
                        G
                      </th>
                      <th className="pb-3 text-center hidden sm:table-cell">
                        A
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((item, index) => (
                      <tr
                        key={item.jogador_id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-4 pl-2 font-bold text-muted-foreground w-12">
                          {index + 1}º
                        </td>
                        <td className="py-4">
                          <PlayerCardModal
                            player={{
                              name: item.jogador_nome,
                              username: item.jogador_username,
                              position: "JOG", // Posição padrão, pois não vem no ranking
                              overall: item.pontuacao_total,
                              stats: {
                                matches: item.presencas,
                                goals: item.gols,
                                assists: item.assistencias,
                              },
                              photo: item.jogador_imagem_perfil,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-15 w-15 border rounded-full bg-background">
                                {item.jogador_imagem_perfil ? (
                                  <AvatarImage
                                    src={
                                      item.jogador_imagem_perfil || undefined
                                    }
                                  />
                                ) : (
                                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                    {item.jogador_nome.charAt(0)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {item.jogador_nome}
                                </p>
                                <p className="text-xs text-muted-foreground sm:hidden">
                                  {item.gols}G • {item.assistencias}A
                                </p>
                              </div>
                            </div>
                          </PlayerCardModal>
                        </td>
                        <td className="py-4 text-center font-bold text-primary text-lg">
                          {item.pontuacao_total}
                        </td>
                        <td className="py-4 text-center hidden sm:table-cell text-muted-foreground">
                          {item.presencas}
                        </td>
                        <td className="py-4 text-center hidden sm:table-cell text-muted-foreground">
                          {item.gols}
                        </td>
                        <td className="py-4 text-center hidden sm:table-cell text-muted-foreground">
                          {item.assistencias}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partidas" className="mt-6">
          <div className="flex justify-end mb-4">
            <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
              <Button
                variant={partidasViewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPartidasViewMode("grid")}
              >
                <FaThLarge className="h-4 w-4" />
              </Button>
              <Button
                variant={partidasViewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPartidasViewMode("list")}
              >
                <FaList className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {partidas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              <FaFutbol className="mx-auto text-4xl mb-4 opacity-20" />
              <p>Nenhuma partida registrada.</p>
              {racha.is_admin && (
                <Link href={`/racha/${id}/nova-partida`}>
                  <Button variant="link" className="mt-2">
                    Criar primeira partida
                  </Button>
                </Link>
              )}
            </div>
          ) : partidasViewMode === "grid" ? (
            <div className="grid gap-4">
              {partidas.map(partida => (
                <Card
                  key={partida.id}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-2 flex flex-row justify-between md:flex-row md:items-center gap-4">
                    <div className="flex flex-row gap-4 items-center">
                      <div className="flex items-center gap-2 ml-4">
                        <Badge
                          variant={
                            partida.status === false
                              ? "destructive"
                              : "default"
                          }
                        >
                          {partida.status}
                        </Badge>
                      </div>
                      <p className="font-medium">{partida.local}</p>
                      <div className="text-sm font-bold">
                        Partida dia{" "}
                        {new Date(partida.criado_em).toLocaleDateString()}{" "}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/partida/${partida.id}/timeline`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Linha do Tempo"
                        >
                          <FaHistory className="h-4 w-4" />
                        </Button>
                      </Link>
                      {racha.is_admin && (
                        <Link href={`/partida/${partida.id}/gerenciar`}>
                          <Button variant="outline" size="sm">
                            <FaCog className="mr-2" /> Gerenciar
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="p-4 font-medium">Data/Hora</th>
                        <th className="p-4 font-medium text-center">Status</th>
                        <th className="p-4 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partidas.map(partida => (
                        <tr
                          key={partida.id}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-medium">
                              Partida dia{" "}
                              {new Date(
                                partida.criado_em
                              ).toLocaleDateString()}{" "}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              variant={
                                partida.status === false
                                  ? "destructive"
                                  : "default"
                              }
                            >
                              {partida.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Link href={`/partida/${partida.id}/gerenciar`}>
                              <Button variant="ghost" size="sm">
                                <FaCog className="mr-2" /> Gerenciar
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="jogadores" className="mt-6">
          <div className="flex justify-end mb-4">
            <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("grid")}
              >
                <FaThLarge className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("list")}
              >
                <FaList className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jogadores.map(item => {
                // Encontrar dados do ranking para este jogador para preencher a carta
                const rankingData = ranking.find(
                  r => r.jogador_id === item.jogador.id
                );
                const stats = rankingData
                  ? {
                      matches: rankingData.presencas,
                      goals: rankingData.gols,
                      assists: rankingData.assistencias,
                    }
                  : { matches: 0, goals: 0, assists: 0 };
                const overall = rankingData ? rankingData.pontuacao_total : 0;

                return (
                  <PlayerCardModal
                    key={item.id}
                    player={{
                      name: `${item.jogador.first_name} ${item.jogador.last_name}`,
                      username: item.jogador.username,
                      position: item.jogador.posicao,
                      overall: overall,
                      stats: stats,
                      photo: item.jogador.imagem_perfil,
                    }}
                  >
                    <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-5">
                        <Avatar className="h-15 w-15 border rounded-full">
                          <AvatarImage
                            src={item.jogador.imagem_perfil || undefined}
                          />
                          <AvatarFallback>
                            {item.jogador.first_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {item.jogador.first_name} {item.jogador.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.jogador.posicao.toLowerCase()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Entrou em{" "}
                            {new Date(item.data_entrada).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </PlayerCardModal>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="p-4 font-medium">Jogador</th>
                        <th className="p-4 font-medium">Posição</th>
                        <th className="p-4 font-medium">Data de Entrada</th>
                        <th className="p-4 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jogadores.map(item => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-4">
                            <PlayerCardModal
                              player={{
                                name: `${item.jogador.first_name} ${item.jogador.last_name}`,
                                username: item.jogador.username,
                                position: item.jogador.posicao,
                                overall:
                                  ranking.find(
                                    r => r.jogador_id === item.jogador.id
                                  )?.pontuacao_total || 0,
                                stats: {
                                  matches:
                                    ranking.find(
                                      r => r.jogador_id === item.jogador.id
                                    )?.presencas || 0,
                                  goals:
                                    ranking.find(
                                      r => r.jogador_id === item.jogador.id
                                    )?.gols || 0,
                                  assists:
                                    ranking.find(
                                      r => r.jogador_id === item.jogador.id
                                    )?.assistencias || 0,
                                },
                                photo: item.jogador.imagem_perfil,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-15 w-15 border rounded-full">
                                  <AvatarImage
                                    src={
                                      item.jogador.imagem_perfil || undefined
                                    }
                                  />
                                  <AvatarFallback>
                                    {item.jogador.first_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {item.jogador.first_name}{" "}
                                  {item.jogador.last_name}
                                </span>
                              </div>
                            </PlayerCardModal>
                          </td>
                          <td className="p-4 capitalize text-muted-foreground">
                            {item.jogador.posicao.toLowerCase()}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(item.data_entrada).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end gap-2">
                                {racha.is_admin && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Status</span>
                                        <Switch 
                                            checked={item.ativo} 
                                            onCheckedChange={() => handleToggleStatus(item.id, item.ativo, item.jogador.id)}
                                        />
                                    </div>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="premios" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaTrophy className="text-yellow-500" /> Prêmios
              </h2>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
                <Button
                  variant={premiosViewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPremiosViewMode("grid")}
                >
                  <FaThLarge className="h-4 w-4" />
                </Button>
                <Button
                  variant={premiosViewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPremiosViewMode("list")}
                >
                  <FaList className="h-4 w-4" />
                </Button>
              </div>
              {racha.is_admin && (
                <Button onClick={() => setPremioModalOpen(true)}>
                  <FaPlus className="mr-2" /> Novo Prêmio
                </Button>
              )}
            </div>
          </div>

          {premios.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              <FaHandshake className="mx-auto text-4xl mb-4 opacity-20" />
              <p>Nenhum prêmio configurado.</p>
              {racha.is_admin && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setPremioModalOpen(true)}
                >
                  Criar primeiro prêmio
                </Button>
              )}
            </div>
          ) : premiosViewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {premios.map(premio => (
                <Card key={premio.id} className="group relative">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <FaTrophy />
                      </div>
                      <div>
                        <p className="font-medium">{premio.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {premio.valor_pontos} pontos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={premio.ativo ? "default" : "secondary"}>
                        {premio.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      {racha.is_admin && (
                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditPremio(premio)}
                          >
                            <TbEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePremio(premio)}
                          >
                            <TbTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="p-4 font-medium">Prêmio</th>
                        <th className="p-4 font-medium">Pontos</th>
                        <th className="p-4 font-medium text-right">Status</th>
                        {racha.is_admin && (
                          <th className="p-4 font-medium text-right w-[100px]">
                            Ações
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {premios.map(premio => (
                        <tr
                          key={premio.id}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 text-xs">
                                <FaTrophy />
                              </div>
                              <span className="font-medium">{premio.nome}</span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {premio.valor_pontos}
                          </td>
                          <td className="p-4 text-right">
                            <Badge
                              variant={premio.ativo ? "default" : "secondary"}
                            >
                              {premio.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </td>
                          {racha.is_admin && (
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditPremio(premio)}
                                >
                                  <TbEdit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeletePremio(premio)}
                                >
                                  <TbTrash className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <PremioModal
            open={isPremioModalOpen}
            onOpenChange={setPremioModalOpen}
            onSubmit={handleSavePremio}
            initialData={editingPremio}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
