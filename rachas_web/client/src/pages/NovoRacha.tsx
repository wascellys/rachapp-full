import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaFutbol, FaArrowLeft } from "react-icons/fa";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function NovoRacha() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    dia_semana: "SABADO",
    horario: "08:00",
    local: "",
    valor_mensal: "",
    limite_jogadores: "20",
    ponto_gol: "1",
    ponto_assistencia: "1",
    ponto_presenca: "1",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        valor_mensal: formData.valor_mensal
          ? parseFloat(formData.valor_mensal)
          : 0,
        limite_jogadores: parseInt(formData.limite_jogadores),
        ponto_gol: parseInt(formData.ponto_gol),
        ponto_assistencia: parseInt(formData.ponto_assistencia),
        ponto_presenca: parseInt(formData.ponto_presenca),
      };

      await api.post("/rachas/", payload);
      toast.success("Racha criado com sucesso!");
      setLocation("/");
    } catch (error: any) {
      console.error("Erro ao criar racha:", error);
      toast.error(
        error.response?.data?.detail ||
          "Erro ao criar racha. Verifique os dados."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-0">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <FaArrowLeft className="mr-2" /> Voltar para Meus Rachas
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FaFutbol className="text-primary w-6 h-6" />
            </div>
            <CardTitle className="text-2xl">Criar Novo Racha</CardTitle>
          </div>
          <CardDescription>
            Configure as informações básicas da sua pelada. Você será o
            administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="novo-racha-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Racha *</Label>
              <Input
                id="nome"
                placeholder="Ex: Pelada dos Amigos"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Regras, observações ou detalhes adicionais..."
                value={formData.descricao}
                onChange={handleChange}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input
                id="local"
                placeholder="Ex: Arena Soccer, Campo do Clube..."
                value={formData.local}
                onChange={handleChange}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4">
                Configuração de Pontuação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ponto_gol">Pontos por Gol</Label>
                  <Input
                    id="ponto_gol"
                    type="number"
                    min="0"
                    value={formData.ponto_gol}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ponto_assistencia">
                    Pontos por Assistência
                  </Label>
                  <Input
                    id="ponto_assistencia"
                    type="number"
                    min="0"
                    value={formData.ponto_assistencia}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ponto_presenca">Pontos por Presença</Label>
                  <Input
                    id="ponto_presenca"
                    type="number"
                    min="0"
                    value={formData.ponto_presenca}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t pt-6">
          <Link href="/">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            form="novo-racha-form"
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? "Criando..." : "Criar Racha"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
