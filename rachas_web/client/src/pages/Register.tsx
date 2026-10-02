import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaFutbol, FaArrowLeft } from "react-icons/fa";
import { Link } from "wouter";
import api from "@/lib/api";
import { mensagemErro, POSICOES } from "@/lib/format";

export default function Register() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    posicao: "ATACANTE",
    telefone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (e.target.id === "username") {
      value = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/\s+/g, "-"); // Replace spaces with hyphens
    }

    setFormData({ ...formData, [e.target.id]: value });
  };

  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, posicao: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      // Registrar usuário (assumindo endpoint de registro ou criando via admin simplificado para demo)
      // Nota: Em produção, usar endpoint real de registro
      await api.post("/usuarios/", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        posicao: formData.posicao,
        telefone: formData.telefone,
      });

      // Login automático após registro
      await login({ username: formData.username, password: formData.password });
      window.location.href = "/";
    } catch (err: any) {
      setError(mensagemErro(err, "Erro ao criar conta. Verifique os dados."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FaFutbol className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Crie sua conta
          </h1>
          <p className="text-muted-foreground">
            Junte-se ao RachApp e gerencie suas partidas
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-8 w-8 rounded-full"
                >
                  <FaArrowLeft />
                </Button>
              </Link>
              <CardTitle>Cadastro</CardTitle>
            </div>
            <CardDescription>Preencha seus dados para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nome</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Nome de Usuário</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  placeholder="ex.: joao-silva"
                  required
                />
                <p className="text-xs text-muted-foreground">É com ele que você entra no app.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posicao">Posição Principal</Label>
                  <Select
                    onValueChange={handleSelectChange}
                    defaultValue={formData.posicao}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione sua posição" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSICOES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, não use só números.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full font-semibold text-lg h-12"
                disabled={loading}
              >
                {loading ? "Criando conta..." : "Cadastrar"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Faça login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
