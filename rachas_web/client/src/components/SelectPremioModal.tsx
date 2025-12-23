import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaTrophy } from "react-icons/fa";
import { toast } from "sonner";

interface Premio {
  id: string;
  nome: string;
  valor_pontos: number;
}

interface SelectPremioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rachaId: string;
  jogadorId: string;
  jogadorNome: string;
  partidaId: string;
  onSuccess: () => void;
}

export function SelectPremioModal({
  open,
  onOpenChange,
  rachaId,
  jogadorId,
  jogadorNome,
  partidaId,
  onSuccess,
}: SelectPremioModalProps) {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [selectedPremioId, setSelectedPremioId] = useState<string>("");
  const [loading, setLoading] = useState(false);




  useEffect(() => {
    if (open && rachaId) {
      carregarPremios();
    }
  }, [open, rachaId]);

  const carregarPremios = async () => {
    try {
      const response = await api.get(`/premios/?search=&racha=${rachaId}`);
      setPremios(response.data?.results || []);

    } catch (error) {
      console.error("Erro ao carregar prêmios:", error);
      toast.error("Erro ao carregar lista de prêmios.");
    }
  };



  const confirmarPremio = async () => {
    if (!selectedPremioId) return;

    try {
      setLoading(true);
      await api.post(`/partidas/${partidaId}/associar_premio/`, {
        jogador_id: jogadorId,
        premio_id: selectedPremioId,
      });

      toast.success(`Prêmio concedido a ${jogadorNome}!`);
      onSuccess();
      onOpenChange(false);
      setSelectedPremioId("");
    } catch (error) {
      console.error("Erro ao associar prêmio:", error);
      toast.error("Erro ao associar prêmio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaTrophy className="text-yellow-500" /> Associar Prêmio
          </DialogTitle>
          <DialogDescription>
            Selecione um prêmio para conceder ao jogador <strong>{jogadorNome}</strong> nesta partida.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">
            Escolha o prêmio
          </label>
          <Select
            value={selectedPremioId}
            onValueChange={setSelectedPremioId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um prêmio..." />
            </SelectTrigger>
            <SelectContent>
              {premios.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Nenhum prêmio cadastrado neste racha.
                </div>
              ) : (
                premios.map((premio) => (
                  <SelectItem key={premio.id} value={premio.id}>
                    {premio.nome} ({premio.valor_pontos} pts)
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={confirmarPremio} disabled={!selectedPremioId || loading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
            {loading ? "Salvando..." : "Confirmar Prêmio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
