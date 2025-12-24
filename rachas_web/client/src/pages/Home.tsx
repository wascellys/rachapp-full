import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FaPlus,
  FaTrophy,
  FaUsers,
  FaCalendarAlt,
  FaArrowRight,
  FaThLarge,
  FaList,
} from "react-icons/fa";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Racha {
  id: string;
  nome: string;
  data_inicio: string | null;
  total_jogadores: number;
  codigo_convite: string;
  administrador: {
    username: string;
  };
}

export default function Home() {
  const [rachas, setRachas] = useState<Racha[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const fetchRachas = async () => {
      try {
        const response = await api.get("/rachas/meus_rachas/");
        setRachas(response.data);
      } catch (error) {
        console.error("Erro ao buscar rachas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRachas();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
         <div className="flex justify-between items-center">
             <div className="space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
             </div>
             <Skeleton className="h-10 w-32" />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
               <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Rachas</h1>
          <p className="text-muted-foreground">
            Gerencie suas peladas e acompanhe seu desempenho
          </p>
        </div>
        <div className="flex gap-2 w-full md:justify-end xl:gap-4 flex-wrap items-center justify-content-center">
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border mr-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("grid")}
            >
              <FaThLarge className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("list")}
            >
              <FaList className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="flex-1 md:flex-none"
            onClick={() => (window.location.href = "/novo-racha")}
          >
            <FaPlus className="mr-2" /> Novo Racha
          </Button>
          <Button
            variant="outline"
            className="flex-1 md:flex-none"
            onClick={() => (window.location.href = "/entrar-racha")}
          >
            Entrar com Código
          </Button>
        </div>
      </div>

      {rachas.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FaUsers className="text-muted-foreground text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Nenhum racha encontrado
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Você ainda não participa de nenhum racha. Crie um novo ou entre em
              um existente usando um código de convite.
            </p>
            <Button onClick={() => (window.location.href = "/novo-racha")}>
              Criar meu primeiro Racha
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {rachas.map(racha => (
            <Link key={racha.id} href={`/racha/${racha.id}`}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge
                      variant="outline"
                      className="mb-2 bg-primary/5 text-primary border-primary/20"
                    >
                      {racha.codigo_convite}
                    </Badge>
                    {racha.data_inicio && (
                      <span className="text-xs text-muted-foreground flex items-center">
                        <FaCalendarAlt className="mr-1" />
                        {new Date(racha.data_inicio).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {racha.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                      <FaUsers className="text-primary mb-1" />
                      <span className="text-2xl font-bold">
                        {racha.total_jogadores}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Jogadores
                      </span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                      <FaTrophy className="text-yellow-500 mb-1" />
                      <span className="text-2xl font-bold">-</span>
                      <span className="text-xs text-muted-foreground">
                        Ranking
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    variant="ghost"
                    className="w-full group-hover:bg-primary/10 group-hover:text-primary"
                  >
                    Ver Detalhes <FaArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Nome</th>
                    <th className="p-4 font-medium">Código</th>
                    <th className="p-4 font-medium text-center">Jogadores</th>
                    <th className="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rachas.map(racha => (
                    <tr
                      key={racha.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 font-medium">
                        <Link
                          href={`/racha/${racha.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {racha.nome}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{racha.codigo_convite}</Badge>
                      </td>
                      <td className="p-4 text-center">
                        {racha.total_jogadores}
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/racha/${racha.id}`}>
                          <Button variant="ghost" size="sm">
                            Ver Detalhes{" "}
                            <FaArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
