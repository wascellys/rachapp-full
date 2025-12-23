import { useState, useEffect } from "react";
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
import {
  FaFutbol,
  FaArrowLeft,
  FaPlus,
  FaTimes,
  FaUserPlus,
  FaFlagCheckered,
  FaHistory,
  FaTrophy,
} from "react-icons/fa";
import { TbSettings, TbTrash, TbCircleCheckFilled } from "react-icons/tb";
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
  time: string;
  presente: boolean;
  gols: number;
  assistencias: number;
}

import { SelectPremioModal } from "@/components/SelectPremioModal";

export default function GerenciarPartida() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/partida/:id/gerenciar");
  const partidaId = params?.id;

  const [loading, setLoading] = useState(true);
  const [partida, setPartida] = useState<any>(null);
  const [jogadoresPartida, setJogadoresPartida] = useState<JogadorPartida[]>(
    []
  );
  const [jogadoresDisponiveis, setJogadoresDisponiveis] = useState<Jogador[]>(
    []
  );

  // Estados para modais
  const [showAddJogador, setShowAddJogador] = useState(false);
  const [showRegistrarGol, setShowRegistrarGol] = useState(false);
  const [showSelectPremio, setShowSelectPremio] = useState(false);
  const [selectedJogadorId, setSelectedJogadorId] = useState<
    string | undefined
  >(undefined);
  const [selectedAssistenciaId, setSelectedAssistenciaId] =
    useState<string>("none");
  const [jogadorGol, setJogadorGol] = useState<JogadorPartida | null>(null);
  const [jogadorPremio, setJogadorPremio] = useState<JogadorPartida | null>(null);

  useEffect(() => {
    if (partidaId) {
      carregarDados();
    }
  }, [partidaId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      // Carregar detalhes da partida
      const partidaRes = await api.get(`/partidas/${partidaId}/`);
      setPartida(partidaRes.data);

      // Carregar jogadores já na partida
      const jogadoresPartidaRes = await api.get(
        `/partidas/${partidaId}/jogadores/`
      );
      setJogadoresPartida(jogadoresPartidaRes.data);

      // Carregar todos os jogadores do racha para adicionar
      const rachaId = partidaRes.data.racha;
      const todosJogadoresRes = await api.get(`/rachas/${rachaId}/jogadores/`);

      // Filtrar apenas os que NÃO estão na partida
      const idsNaPartida = new Set(
        jogadoresPartidaRes.data.map((jp: any) => String(jp.jogador.id))
      );

      // Mapear corretamente a resposta da API de jogadores do racha
      // A API retorna JogadoresRacha, que tem o campo 'jogador'
      const todosJogadores = todosJogadoresRes.data.map(
        (jr: any) => jr.jogador
      );

      const disponiveis = todosJogadores.filter(
        (j: any) => !idsNaPartida.has(String(j.id))
      );

      console.log("Jogadores disponíveis:", disponiveis); // Debug
      setJogadoresDisponiveis(disponiveis);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da partida.");
    } finally {
      setLoading(false);
    }
  };

  const adicionarJogador = async () => {
    if (!selectedJogadorId) return;

    try {
      await api.post(`/partidas/${partidaId}/adicionar_jogador/`, {
        jogador_id: selectedJogadorId,
        time: "A", // Padrão, depois pode mudar
        presente: true,
      });

      toast.success("Jogador adicionado!");
      setShowAddJogador(false);
      setSelectedJogadorId("");
      carregarDados(); // Recarrega tudo
    } catch (error: any) {
      toast.error("Erro ao adicionar jogador.");
    }
  };

  const abrirModalGol = (jogador: JogadorPartida) => {
    setJogadorGol(jogador);
    setSelectedAssistenciaId("none");
    setShowRegistrarGol(true);
  };

  const abrirModalPremio = (jogador: JogadorPartida) => {
    setJogadorPremio(jogador);
    setShowSelectPremio(true);
  };

  const registrarGol = async () => {
    if (!jogadorGol) return;

    try {
      const payload: any = {
        jogador_gol_id: jogadorGol.jogador.id,
        minuto: 0, // Opcional
      };

      if (selectedAssistenciaId && selectedAssistenciaId !== "none") {
        payload.jogador_assistencia_id = selectedAssistenciaId;
      }

      await api.post(`/partidas/${partidaId}/registrar_gol/`, payload);

      toast.success(`Gol de ${jogadorGol.jogador.first_name} registrado!`);
      setShowRegistrarGol(false);
      carregarDados(); // Atualiza placar e estatísticas
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao registrar gol.");
    }
  };

  const finalizarPartida = async () => {
    if (
      !confirm(
        "Tem certeza que deseja finalizar a partida? Isso atualizará o ranking."
      )
    )
      return;

    try {
      await api.post(`/partidas/${partidaId}/finalizar/`);
      toast.success("Partida finalizada com sucesso!");
      setLocation(`/racha/${partida.racha}`);
    } catch (error) {
      toast.error("Erro ao finalizar partida.");
    }
  };

  if (loading)
    return <div className="p-8 text-center">Carregando partida...</div>;

  return (
    <div className="max-w-4xl mx-auto py-0 space-y-6">
      {/* Header da Partida */}
      <div className="flex items-center justify-between">
        <Link href={`/racha/${partida.racha}`}>
          <Button variant="ghost" className="pl-0">
            <FaArrowLeft className="mr-2" /> Voltar
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/partida/${partidaId}/timeline`}>
            <Button variant="outline" className="gap-2">
              <FaHistory /> Linha do Tempo
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <TbSettings />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações da Partida</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {partida.status !== "FINALIZADA" && (
                <DropdownMenuItem
                  onClick={finalizarPartida}
                  className="text-yellow-600 cursor-pointer"
                >
                  <FaFlagCheckered className="mr-2" /> Finalizar Partida
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => {
                  if (
                    confirm(
                      "Tem certeza que deseja excluir esta partida? Todos os registros serão perdidos."
                    )
                  ) {
                    api.delete(`/partidas/${partidaId}/`).then(() => {
                      toast.success("Partida excluída");
                      setLocation(`/racha/${partida.racha}`);
                    });
                  }
                }}
              >
                <TbTrash className="mr-2" /> Excluir Partida
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Lista de Jogadores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Jogadores Presentes</CardTitle>
          {partida.status !== "FINALIZADA" && (
            <Button size="sm" onClick={() => setShowAddJogador(true)}>
              <FaUserPlus className="mr-2" /> Adicionar Jogador
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jogadoresPartida.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum jogador adicionado ainda.
              </p>
            ) : (
              jogadoresPartida.map(jp => (
                <div
                  key={jp.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={jp.jogador.imagem_perfil || undefined} />
                      <AvatarFallback>
                        {jp.jogador.first_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {jp.jogador.first_name} {jp.jogador.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {jp.jogador.posicao}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Estatísticas Rápidas */}
                    <div className="flex gap-3 text-sm">
                      {jp.gols > 0 && (
                        <span
                          className="flex items-center text-green-500 font-bold"
                          title="Gols"
                        >
                          <FaFutbol className="mr-1" /> {jp.gols}
                        </span>
                      )}
                      {jp.assistencias > 0 && (
                        <span
                          className="flex items-center text-blue-500 font-bold"
                          title="Assistências"
                        >
                          <TbCircleCheckFilled className="mr-1" /> {jp.assistencias}
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    {partida.status !== "FINALIZADA" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700"
                          onClick={() => abrirModalPremio(jp)}
                          title="Dar prêmio"
                        >
                           <FaTrophy />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => abrirModalGol(jp)}
                          title="Registrar gol"
                        >
                          <FaFutbol className="mr" /> 
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Adicionar Jogador */}
      <Dialog open={showAddJogador} onOpenChange={setShowAddJogador}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Jogador à Partida</DialogTitle>
            <DialogDescription>
              Selecione um jogador do racha para participar.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select
              value={selectedJogadorId || ""}
              onValueChange={setSelectedJogadorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o jogador..." />
              </SelectTrigger>
              <SelectContent>
                {jogadoresDisponiveis.map(j => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.first_name} {j.last_name} ({j.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddJogador(false)}>
              Cancelar
            </Button>
            <Button onClick={adicionarJogador} disabled={!selectedJogadorId}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Gol */}
      <Dialog open={showRegistrarGol} onOpenChange={setShowRegistrarGol}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Gol</DialogTitle>
            <DialogDescription>
              Gol de{" "}
              <strong>
                {jogadorGol?.jogador.first_name} {jogadorGol?.jogador.last_name}
              </strong>
              . Quem deu a assistência?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Assistência (Opcional)
            </label>
            <Select
              value={selectedAssistenciaId}
              onValueChange={setSelectedAssistenciaId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem assistência / Jogada individual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Sem assistência / Jogada individual
                </SelectItem>
                {jogadoresPartida
                  .filter(jp => jp.jogador.id !== jogadorGol?.jogador.id) // Não pode dar assistência pra si mesmo
                  .map(jp => (
                    <SelectItem key={jp.jogador.id} value={jp.jogador.id}>
                      {jp.jogador.first_name} {jp.jogador.last_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegistrarGol(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={registrarGol}
              className="bg-green-600 hover:bg-green-700"
            >
              <FaFutbol className="mr-2" /> Confirmar Gol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar Premio */}
      {jogadorPremio && (
        <SelectPremioModal
          open={showSelectPremio}
          onOpenChange={setShowSelectPremio}
          rachaId={partida?.racha}
          jogadorId={jogadorPremio.jogador.id}
          jogadorNome={`${jogadorPremio.jogador.first_name} ${jogadorPremio.jogador.last_name}`}
          partidaId={partidaId!}
          onSuccess={() => {
            // Se quisesse recarregar a lista, poderia, mas premios nao aparecem na lista simples por enquanto
            // carregarDados(); 
          }}
        />
      )}
    </div>
  );
}
