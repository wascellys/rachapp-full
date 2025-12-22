import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Trash2, Edit2, Save, X } from "lucide-react";
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
  jogador_gol: Jogador;
  jogador_assistencia: Jogador | null;
  criado_em: string;
}

interface Partida {
  id: string;
  racha: string;
  data_inicio: string;
  data_fim: string | null;
  registros: Registro[];
  racha_is_admin: boolean;
}

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
    setNovoAutorGol(registro.jogador_gol.id);
    setNovoAutorAssistencia(registro.jogador_assistencia?.id || "nenhum");
    setModalEdicaoAberto(true);
  };

  const handleSalvarEdicao = async () => {
    if (!registroEditando) return;

    try {
      const payload: any = {
        registro_id: registroEditando.id,
        jogador_gol_id: novoAutorGol,
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

  // Ordenar registros do mais recente para o mais antigo
  const registrosOrdenados = [...partida.registros].sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
  );

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
          <h1 className="text-lg font-bold text-foreground">Linha do Tempo</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(partida.data_inicio).toLocaleDateString("pt-BR")} •{" "}
            {formatarHora(partida.data_inicio)}
          </p>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto p-4 space-y-6">
        {registrosOrdenados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum evento registrado nesta partida ainda.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-border space-y-8 pl-8 py-4">
            {registrosOrdenados.map(registro => (
              <div key={registro.id} className="relative">
                {/* Marcador da linha do tempo */}
                <div className="absolute -left-[41px] top-15 h-5 w-5 rounded-full bg-primary border-4 border-background flex items-center justify-center"></div>

                <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2 xl:mb-4 justify-content-center align-items-center">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary ">
                        <Clock className="h-4 w-4" />
                        {formatarHora(registro.criado_em)}
                      </div>
                      {partida.racha_is_admin && (
                        <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => abrirModalEdicao(registro)}
                        >
                          <Edit2 className="h-2 w-2" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoverRegistro(registro.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⚽</span>
                        <span className="font-bold text-foreground text-lg">
                          {registro.jogador_gol.first_name ||
                            registro.jogador_gol.username}
                        </span>
                      </div>

                      {registro.jogador_assistencia && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm pl-9">
                          <span>👟 Assistência:</span>
                          <span className="font-medium text-foreground">
                            {registro.jogador_assistencia.first_name ||
                              registro.jogador_assistencia.username}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
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
