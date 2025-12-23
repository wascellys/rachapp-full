import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaArrowLeft,
} from "react-icons/fa";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function NovaPartida() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/racha/:id/nova-partida");
  const rachaId = params?.id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    horario: "08:00",
    local: "",
    valor_total: "",
  });

  useEffect(() => {
    if (rachaId) {
      // Carregar dados do racha para preencher local e horário padrão
      api
        .get(`/rachas/${rachaId}/`)
        .then(response => {
          const racha = response.data;
          setFormData(prev => ({
            ...prev,
            horario: racha.horario || "08:00",
            local: racha.local || "",
          }));
        })
        .catch(console.error);
    }
  }, [rachaId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        racha: rachaId,
        data: formData.data,
        horario: formData.horario,
        local: formData.local,
        valor_total: formData.valor_total
          ? parseFloat(formData.valor_total)
          : 0,
        status: true,
      };

      const response = await api.post("/partidas/", payload);
      toast.success("Partida criada com sucesso!");
      // Redirecionar para a tela de gestão da partida criada
      setLocation(`/partida/${response.data.id}/gerenciar`);
    } catch (error: any) {
      console.error("Erro ao criar partida:", error);
      toast.error(error.response?.data?.detail || "Erro ao criar partida.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-0">
      <div className="mb-6">
        <Link href={`/racha/${rachaId}`}>
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <FaArrowLeft className="mr-2" /> Voltar para o Racha
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FaCalendarAlt className="text-primary w-6 h-6" />
            </div>
            <CardTitle className="text-2xl">Nova Partida</CardTitle>
          </div>
          <CardDescription>Agende o próximo jogo da galera.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="nova-partida-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario">Horário *</Label>
              <div className="relative">
                <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="horario"
                  type="time"
                  value={formData.horario}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="local"
                  placeholder="Onde será o jogo?"
                  value={formData.local}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_total">Custo Total (R$)</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.valor_total}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Usado para dividir os custos entre os jogadores
                presentes.
              </p>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t pt-6">
          <Link href={`/racha/${rachaId}`}>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            form="nova-partida-form"
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? "Criando..." : "Criar Partida"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
