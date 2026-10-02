import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FaPlus, FaUsers, FaArrowRight, FaSignInAlt, FaFutbol } from "react-icons/fa";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemErro } from "@/lib/format";

interface Racha {
  id: string;
  nome: string;
  descricao?: string | null;
  total_jogadores: number;
  codigo_convite: string;
  is_admin: boolean;
  ponto_gol: number;
  ponto_assistencia: number;
  ponto_presenca: number;
}

export default function Home() {
  const { user } = useAuth();
  const [rachas, setRachas] = useState<Racha[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/rachas/meus_rachas/")
      .then(res => setRachas(res.data))
      .catch(error => setErro(mensagemErro(error, "Não foi possível carregar seus rachas.")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
            Olá, {user?.first_name || user?.username} 👋
          </p>
          <h1 className="text-3xl font-black tracking-tight">Meus Rachas</h1>
          <p className="text-muted-foreground">Gerencie suas peladas e acompanhe seu desempenho.</p>
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          <Link href="/novo-racha" className="flex-1 md:flex-none">
            <Button className="w-full"><FaPlus /> Novo racha</Button>
          </Link>
          <Link href="/entrar-racha" className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full"><FaSignInAlt /> Entrar com código</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full rounded-3xl" />)}
        </div>
      ) : erro ? (
        <Card><CardContent className="py-10 text-center font-bold text-destructive">{erro}</CardContent></Card>
      ) : rachas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-2xl text-primary">
            <FaFutbol aria-hidden />
          </div>
          <h2 className="text-xl font-black">Bora pro primeiro racha?</h2>
          <p className="max-w-sm text-muted-foreground">
            Crie um racha para a sua turma ou peça o código de convite para quem organiza a pelada.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/novo-racha"><Button><FaPlus /> Criar meu primeiro racha</Button></Link>
            <Link href="/entrar-racha"><Button variant="outline">Tenho um código</Button></Link>
          </div>
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rachas.map(racha => (
            <Link key={racha.id} href={`/racha/${racha.id}`} className="group rounded-3xl">
              <Card className="card-game relative h-full overflow-hidden transition-colors group-hover:border-primary/60">
                <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-xl" />
                <CardContent className="relative flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-xl text-primary">
                      <FaFutbol aria-hidden />
                    </div>
                    <div className="flex gap-1.5">
                      {racha.is_admin && <Badge variant="gold">Admin</Badge>}
                      <Badge variant="outline" className="font-mono tracking-widest">{racha.codigo_convite}</Badge>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-black transition-colors group-hover:text-primary">{racha.nome}</h2>
                    {racha.descricao && <p className="line-clamp-2 text-sm text-muted-foreground">{racha.descricao}</p>}
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <FaUsers aria-hidden /> <span className="text-foreground">{racha.total_jogadores}</span> jogadores
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      Abrir <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
