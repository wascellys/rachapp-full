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
import { FaSignInAlt, FaArrowLeft, FaSearch } from "react-icons/fa";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatarData, mensagemErro } from "@/lib/format";

export default function EntrarRacha() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);

  // Carregar lista de solicitações
  const carregarSolicitacoes = async () => {
    try {
      const res = await api.get("/solicitacoes/?tipo=enviadas");
      // Handle potential pagination
      const data = res.data.results ? res.data.results : res.data;
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erro ao carregar solicitações", e);
    }
  };

  useEffect(() => {
    carregarSolicitacoes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) return;

    setLoading(true);

    try {
      await api.post("/solicitacoes/", {
        codigo_convite: codigo.trim(),
      });

      toast.success(
        "Solicitação enviada com sucesso! Aguarde a aprovação do administrador."
      );
      setCodigo("");
      carregarSolicitacoes();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Nenhum racha encontrado com este código. Confira com o administrador.");
      } else {
        toast.error(mensagemErro(error, "Erro ao enviar solicitação. Tente novamente."));
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE': return <Badge variant="warning">⏳ Pendente</Badge>;
      case 'ACEITO': return <Badge variant="live">✓ Aceito</Badge>;
      case 'NEGADO': return <Badge variant="danger">✕ Negado</Badge>;
      default: return status;
    }
  };

  return (
    <div className="max-w-md mx-auto py-0 space-y-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <FaArrowLeft className="mr-2" /> Voltar
          </Button>
        </Link>
      </div>

      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            <FaSignInAlt className="text-primary w-8 h-8" />
          </div>
          <CardTitle className="text-2xl">Entrar em um Racha</CardTitle>
          <CardDescription>
            Digite o código de convite fornecido pelo administrador do racha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-base">
                Código de Convite
              </Label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="codigo"
                  placeholder="Ex: X7K2P"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  className="pl-10 text-center font-mono text-2xl font-black tracking-[0.4em] uppercase"
                  required
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={5}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O código tem 5 letras/números e aparece na página do racha.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={loading || codigo.length !== 5}
            >
              {loading ? "Enviando solicitação..." : "Solicitar Entrada"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-6 bg-muted/10">
          <p className="text-sm text-muted-foreground">
            Não tem um código?{" "}
            <Link
              href="/novo-racha"
              className="text-primary hover:underline font-medium"
            >
              Crie seu próprio racha
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* Tabela de Solicitações */}
      {solicitacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minhas Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {solicitacoes.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-muted/30 p-3">
                  <div>
                    <p className="font-bold">{s.racha?.nome ?? "Racha"}</p>
                    <p className="text-xs text-muted-foreground">Enviada em {formatarData(s.criado_em)}</p>
                  </div>
                  <div>
                    {getStatusBadge(s.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
