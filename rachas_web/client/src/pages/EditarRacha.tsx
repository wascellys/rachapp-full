import { useEffect, useState } from "react";
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
import { FaEdit, FaArrowLeft, FaTrash } from "react-icons/fa";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

export default function EditarRacha() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/racha/:id/editar");
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    dia_semana: "",
    horario: "",
    local: "",
    valor_mensal: "",
    limite_jogadores: "",
    ponto_gol: "",
    ponto_assistencia: "",
    ponto_presenca: "",
    administradores_ids: [] as string[],
  });
  const [jogadores, setJogadores] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchRacha = async () => {
      try {
        const response = await api.get(`/rachas/${id}/`);
        const data = response.data;

        setFormData({
          nome: data.nome || "",
          descricao: data.descricao || "",
          dia_semana: data.dia_semana || "",
          horario: data.horario || "",
          local: data.local || "",
          valor_mensal: data.valor_mensal?.toString() || "",
          limite_jogadores: data.limite_jogadores?.toString() || "20",
          ponto_gol: data.ponto_gol?.toString() || "1",
          ponto_assistencia: data.ponto_assistencia?.toString() || "1",
          ponto_presenca: data.ponto_presenca?.toString() || "1",
          administradores_ids: data.administradores_ids || [],
        });
        
        // Carregar jogadores para seleção de admin
        const jogadoresRes = await api.get(`/rachas/${id}/jogadores/`);
        setJogadores(jogadoresRes.data);
      } catch (error) {
        console.error("Erro ao carregar racha:", error);
        toast.error("Erro ao carregar dados do racha.");
        setLocation("/");
      } finally {
        setLoading(false);
      }
    };

    fetchRacha();
  }, [id, setLocation]);

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
    setSaving(true);

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
        administradores_ids: formData.administradores_ids,
      };

      await api.patch(`/rachas/${id}/`, payload);
      toast.success("Racha atualizado com sucesso!");
      setLocation(`/racha/${id}`);
    } catch (error: any) {
      console.error("Erro ao atualizar racha:", error);
      toast.error(error.response?.data?.detail || "Erro ao atualizar racha.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/rachas/${id}/`);
      toast.success("Racha excluído com sucesso.");
      setLocation("/");
    } catch (error) {
      console.error("Erro ao excluir racha:", error);
      toast.error("Erro ao excluir racha.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-0 space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="rounded-xl border shadow-sm p-6 space-y-6">
           <Skeleton className="h-8 w-48" />
           <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-3 gap-4">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-0">
      <div className="mb-6">
        <Link href={`/racha/${id}`}>
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <FaArrowLeft className="mr-2" /> Voltar para Detalhes
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between md:flex-row flex-row flex-wrap gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FaEdit className="text-primary w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Editar Racha</CardTitle>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <FaTrash className="mr-2" /> Excluir Racha
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá
                    permanentemente o racha e todos os dados associados,
                    incluindo histórico de partidas e rankings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, excluir racha
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <CardDescription>
            Atualize as informações do seu racha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="editar-racha-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Racha *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input
                id="local"
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

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4">Administradores</h3>
               <div className="space-y-3 max-h-60 overflow-y-auto p-2 border rounded-md">
                {jogadores.map((item) => (
                  <div key={item.jogador.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`admin-${item.jogador.id}`} 
                      checked={formData.administradores_ids.includes(item.jogador.id)}
                      onCheckedChange={(checked) => {
                        const currentIds = formData.administradores_ids;
                        if (checked) {
                          setFormData({
                            ...formData,
                            administradores_ids: [...currentIds, item.jogador.id]
                          });
                        } else {
                           setFormData({
                            ...formData,
                            administradores_ids: currentIds.filter(id => id !== item.jogador.id)
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={`admin-${item.jogador.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {item.jogador.first_name} {item.jogador.last_name} ({item.jogador.username})
                    </label>
                  </div>
                ))}
                {jogadores.length === 0 && <p className="text-sm text-muted-foreground">Nenhum jogador encontrado.</p>}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t pt-6">
          <Link href={`/racha/${id}`}>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            form="editar-racha-form"
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
