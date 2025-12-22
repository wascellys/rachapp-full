import { useState } from "react";
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

export default function EntrarRacha() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) return;

    setLoading(true);

    try {
      // Primeiro buscamos o racha pelo código para confirmar (opcional, mas boa UX)
      // Como a API de solicitação já recebe o código, podemos tentar direto

      // Enviar solicitação de entrada
      await api.post("/solicitacoes/", {
        codigo_convite: codigo.trim(),
      });

      toast.success(
        "Solicitação enviada com sucesso! Aguarde a aprovação do administrador."
      );
      setLocation("/solicitacoes");
    } catch (error: any) {
      console.error("Erro ao entrar no racha:", error);

      // Tratamento de erros específicos
      if (error.response?.status === 404) {
        toast.error("Racha não encontrado com este código.");
      } else if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Erro ao enviar solicitação. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-0">
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
                  placeholder="Ex: RACHA-1234"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.toUpperCase())}
                  className="pl-10 text-center font-mono text-lg tracking-wider uppercase"
                  required
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O código geralmente tem 6 a 10 caracteres alfanuméricos.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={loading || !codigo}
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
    </div>
  );
}
