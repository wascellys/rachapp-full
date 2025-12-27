import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Trash2, Edit2, Save, X, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaFutbol, FaHandshake } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface JogadorStats {
  id: string;
  jogador: Jogador;
  gols: number;
  assistencias: number;
}

interface Jogador {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  posicao: string;
  imagem_perfil: string | null;
}

interface Registro {
  id: string;
  partida: string;
  jogador_gol: Jogador | null;
  jogador_assistencia: Jogador | null;
  criado_em: string;
}

interface Premio {
  id: string;
  nome: string;
  valor_pontos: number;
}

interface PremioPartida {
  id: string;
  partida: string;
  premio: Premio;
  jogador: Jogador;
  criado_em: string;
}

interface Partida {
  id: string;
  racha: string;
  data_inicio: string;
  data_fim: string | null;
  registros: Registro[];
  premios_partida: PremioPartida[];
  racha_is_admin: boolean;
}

type TimelineEvent = 
  | { type: 'GOL', data: Registro, timestamp: number }
  | { type: 'PREMIO', data: PremioPartida, timestamp: number };

export default function TimelinePartida() {
  const [, params] = useRoute("/partida/:id/timeline");
  const [, setLocation] = useLocation();
  const partidaId = params?.id;

  const [partida, setPartida] = useState<Partida | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para edição
  const [registroEditando, setRegistroEditando] = useState<Registro | null>(
    null
  );
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [novoAutorGol, setNovoAutorGol] = useState<string>("");
  const [novoAutorAssistencia, setNovoAutorAssistencia] =
    useState<string>("nenhum");

  useEffect(() => {
    if (partidaId) {
      carregarDados();
    }
  }, [partidaId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const partidaRes = await api.get(`/partidas/${partidaId}/`);
      setPartida(partidaRes.data);

      // Carregar jogadores da partida para o modal de edição
      const jogadoresRes = await api.get(`/partidas/${partidaId}/jogadores/`);
      // Mapear a resposta para extrair os dados do usuário
      const listaJogadores = jogadoresRes.data.map((item: any) => item.jogador);
      setJogadores(listaJogadores);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar linha do tempo");
    } finally {
      setLoading(false);
    }
  };

  const formatarHora = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRemoverRegistro = async (registroId: string) => {
    if (!confirm("Tem certeza que deseja remover este gol?")) return;

    try {
      await api.delete(`/partidas/${partidaId}/remover_registro/`, {
        data: { registro_id: registroId },
      });
      toast.success("Gol removido com sucesso!");
      carregarDados();
    } catch (error) {
      console.error("Erro ao remover registro:", error);
      toast.error("Erro ao remover gol");
    }
  };

  const abrirModalEdicao = (registro: Registro) => {
    setRegistroEditando(registro);
    setNovoAutorGol(registro.jogador_gol?.id || "anonimo");
    setNovoAutorAssistencia(registro.jogador_assistencia?.id || "nenhum");
    setModalEdicaoAberto(true);
  };

  const handleSalvarEdicao = async () => {
    if (!registroEditando) return;

    try {
      const payload: any = {
        registro_id: registroEditando.id,
        jogador_gol_id: novoAutorGol === "anonimo" ? null : novoAutorGol,
      };

      if (novoAutorAssistencia === "nenhum") {
        // Se selecionou "Sem assistência", enviamos null explicitamente se a API suportar
        // ou usamos um endpoint que trata isso. No nosso caso, o backend espera null ou ID.
        // Como o axios remove null/undefined de alguns payloads, vamos garantir que enviamos
        // null se for o caso, ou tratar no backend.
        // O backend espera 'jogador_assistencia_id' no body.
        payload.jogador_assistencia_id = null;
      } else {
        payload.jogador_assistencia_id = novoAutorAssistencia;
      }

      // Nota: O axios pode não enviar null corretamente em JSON dependendo da config.
      // Vamos enviar null explicitamente.

      await api.put(`/partidas/${partidaId}/editar_registro/`, payload);

      toast.success("Registro atualizado com sucesso!");
      setModalEdicaoAberto(false);
      carregarDados();
    } catch (error) {
      console.error("Erro ao editar registro:", error);
      toast.error("Erro ao atualizar registro");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!partida) return null;

  // Combinar e ordenar registros e prêmios do mais recente para o mais antigo
  const eventos: TimelineEvent[] = [
    ...partida.registros.map(r => ({ 
      type: 'GOL' as const, 
      data: r, 
      timestamp: new Date(r.criado_em).getTime() 
    })),
    ...partida.premios_partida.map(p => ({ 
      type: 'PREMIO' as const, 
      data: p, 
      timestamp: new Date(p.criado_em).getTime() 
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-background">
      {/* Header */}
      <header className="py-4 flex gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(`/racha/${partida.racha}/?tab=partidas`)}
          className="hover:bg-accent"
        >
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Detalhes da Partida</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(partida.data_inicio).toLocaleDateString("pt-BR")} •{" "}
            {formatarHora(partida.data_inicio)}
          </p>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto p-4">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="destaques">Destaques</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            {eventos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento registrado nesta partida ainda.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-border space-y-8 pl-8 py-4">
                {eventos.map((evento) => (
                  <div key={evento.type === 'GOL' ? evento.data.id : evento.data.id} className="relative">
                    {/* Marcador da linha do tempo */}
                    <div className={`absolute -left-[41px] top-15 h-5 w-5 rounded-full border-4 border-background flex items-center justify-center ${
                      evento.type === 'GOL' ? 'bg-primary' : 'bg-yellow-500'
                    }`}></div>

                    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2 xl:mb-4 justify-content-center align-items-center">
                          <div className={`flex items-center gap-2 text-sm font-medium ${
                            evento.type === 'GOL' ? 'text-primary' : 'text-yellow-600'
                          }`}>
                            {evento.type === 'GOL' ? <Clock className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                            {formatarHora(evento.data.criado_em)}
                          </div>
                          
                          {evento.type === 'GOL' && partida.racha_is_admin && (
                            <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => abrirModalEdicao(evento.data)}
                            >
                              <Edit2 className="h-2 w-2" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoverRegistro(evento.data.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          )}
                        </div>

                        {evento.type === 'GOL' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-2xl flex-shrink-0">⚽</span>
                              <span className="font-bold text-foreground text-lg truncate">
                                {evento.data.jogador_gol 
                                  ? (evento.data.jogador_gol.first_name || evento.data.jogador_gol.username)
                                  : "Anônimo / Outro"}
                              </span>
                            </div>

                            {evento.data.jogador_assistencia && (
                              <div className="flex items-center gap-2 text-muted-foreground text-sm pl-9 min-w-0">
                                <span className="flex-shrink-0">👟 Assistência:</span>
                                <span className="font-medium text-foreground truncate">
                                  {evento.data.jogador_assistencia.first_name ||
                                    evento.data.jogador_assistencia.username}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                             <div className="flex items-center gap-2 min-w-0">
                              <span className="text-2xl flex-shrink-0">🏆</span>
                              <span className="font-bold text-foreground text-lg truncate">
                                {evento.data.premio.nome}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm pl-9 min-w-0">
                                <span className="flex-shrink-0">Para:</span>
                                <span className="font-medium text-foreground truncate">
                                  {evento.data.jogador.first_name ||
                                    evento.data.jogador.username}
                                </span>
                                 <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                  +{evento.data.premio.valor_pontos} pts
                                </span>
                              </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="destaques" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Artilheiros */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FaFutbol className="text-primary" /> Artilheiros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const gols: Record<string, { jogador: Jogador, count: number }> = {};
                    partida.registros.forEach(r => {
                      if (r.jogador_gol) {
                        const id = r.jogador_gol.id;
                        if (!gols[id]) gols[id] = { jogador: r.jogador_gol, count: 0 };
                        gols[id].count++;
                      }
                    });
                    const topGols = Object.values(gols).sort((a, b) => b.count - a.count);

                    if (topGols.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Sem gols registrados</p>;
                    
                    return (
                      <div className="space-y-3">
                        {topGols.slice(0, 3).map((item, idx) => (
                          <div key={item.jogador.id} className="flex items-center justify-between min-w-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-6 text-center font-bold flex-shrink-0 ${idx === 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                {idx + 1}º
                              </div>
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={item.jogador.imagem_perfil || undefined} />
                                <AvatarFallback>{item.jogador.first_name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm truncate">
                                {item.jogador.first_name} {item.jogador.last_name}
                              </span>
                            </div>
                            <div className="font-bold text-primary flex-shrink-0 ml-2">{item.count}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Assistências */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FaHandshake className="text-blue-500" /> Líderes em Assistências
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const assistencias: Record<string, { jogador: Jogador, count: number }> = {};
                    partida.registros.forEach(r => {
                      if (r.jogador_assistencia) {
                        const id = r.jogador_assistencia.id;
                        if (!assistencias[id]) assistencias[id] = { jogador: r.jogador_assistencia, count: 0 };
                        assistencias[id].count++;
                      }
                    });
                    const topAssistencias = Object.values(assistencias).sort((a, b) => b.count - a.count);

                    if (topAssistencias.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Sem assistências</p>;

                    return (
                      <div className="space-y-3">
                        {topAssistencias.slice(0, 3).map((item, idx) => (
                          <div key={item.jogador.id} className="flex items-center justify-between min-w-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-6 text-center font-bold flex-shrink-0 ${idx === 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                {idx + 1}º
                              </div>
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={item.jogador.imagem_perfil || undefined} />
                                <AvatarFallback>{item.jogador.first_name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm truncate">
                                {item.jogador.first_name} {item.jogador.last_name}
                              </span>
                            </div>
                            <div className="font-bold text-blue-500 flex-shrink-0 ml-2">{item.count}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Prêmios */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="text-yellow-500" /> Prêmios da Partida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {partida.premios_partida && partida.premios_partida.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {partida.premios_partida.map(premio => (
                        <div key={premio.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border min-w-0">
                          <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 flex-shrink-0">
                             <Trophy className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{premio.premio.nome}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                              <span className="flex-shrink-0">Para:</span>
                              <span className="font-medium text-foreground truncate">
                                {premio.jogador.first_name} {premio.jogador.last_name}
                              </span>
                            </div>
                          </div>
                          <div className="ml-auto flex-shrink-0">
                            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                              +{premio.premio.valor_pontos} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum prêmio distribuído nesta partida</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de Edição */}
      <Dialog open={modalEdicaoAberto} onOpenChange={setModalEdicaoAberto}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Lance</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Autor do Gol</Label>
              <Select value={novoAutorGol} onValueChange={setNovoAutorGol}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o jogador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anonimo">Anônimo / Outro</SelectItem>
                  {jogadores.map(jogador => (
                    <SelectItem key={jogador.id} value={jogador.id}>
                      {jogador.first_name || jogador.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assistência (Opcional)</Label>
              <Select
                value={novoAutorAssistencia}
                onValueChange={setNovoAutorAssistencia}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione quem deu o passe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem assistência</SelectItem>
                  {jogadores
                    .filter(j => j.id !== novoAutorGol)
                    .map(jogador => (
                      <SelectItem key={jogador.id} value={jogador.id}>
                        {jogador.first_name || jogador.username}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setModalEdicaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarEdicao}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
