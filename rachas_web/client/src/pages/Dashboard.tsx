
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FaFutbol,
  FaTrophy,
  FaHandshake,
  FaChartLine,
  FaUserFriends,
  FaEdit,
} from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  id: string;
  nome: string;
  posicao: string;
  imagem_perfil: string | null;
  rachas_count: number;
  partidas_count: number;
  gols: number;
  assistencias: number;
  media_gols: number;
  media_assistencias: number;
  melhor_garcom: {
    id: string;
    nome: string;
    assistencias: number;
    imagem_perfil: string | null;
  } | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/usuarios/dashboard/");
        setStats(response.data);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-background to-muted/20 border-primary/20">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 md:h-40 md:w-40 border-4 border-background shadow-xl rounded-full bg-background">
              <AvatarImage src={stats.imagem_perfil || undefined} className="object-cover" />
              <AvatarFallback className="text-4xl bg-muted">
                {stats.nome.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{stats.nome}</h1>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {stats.posicao}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">
                Atleta desde {new Date().getFullYear()} • Participando de{" "}
                {stats.rachas_count} {stats.rachas_count === 1 ? "Racha" : "Rachas"}
              </p>
              <Link href="/perfil">
                <Button size="sm" variant="outline">
                  <FaEdit className="mr-2" /> Editar Perfil
                </Button>
              </Link>
            </div>
          
            {/* Quick Stats - Mobile visible, Desktop compact */}
            <div className="flex gap-4 md:gap-8 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-8 mt-2 md:mt-0">
               <div className="text-center">
                 <p className="text-3xl font-bold text-primary">{stats.partidas_count}</p>
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Jogos</p>
               </div>
               <div className="text-center">
                 <p className="text-3xl font-bold text-primary">{stats.gols}</p>
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Gols</p>
               </div>
               <div className="text-center">
                 <p className="text-3xl font-bold text-primary">{stats.assistencias}</p>
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Assists</p>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <h2 className="text-xl font-bold flex items-center gap-2">
        <FaChartLine className="text-primary" /> Estatísticas Gerais
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total de Gols */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gols</CardTitle>
            <FaFutbol className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gols}</div>
            <p className="text-xs text-muted-foreground">
              Gols marcados
            </p>
          </CardContent>
        </Card>

        {/* Total de Assistências */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Assists</CardTitle>
            <FaHandshake className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assistencias}</div>
            <p className="text-xs text-muted-foreground">
              Assistências realizadas
            </p>
          </CardContent>
        </Card>

        {/* Média de Gols */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Gols</CardTitle>
            <FaFutbol className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.media_gols}</div>
            <p className="text-xs text-muted-foreground">
              Gols por partida
            </p>
          </CardContent>
        </Card>

        {/* Média de Assistências */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Média de Assists
            </CardTitle>
            <FaHandshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.media_assistencias}</div>
            <p className="text-xs text-muted-foreground">
              Assistências por partida
            </p>
          </CardContent>
        </Card>

        {/* Participação em Gols */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Participação em Gols
            </CardTitle>
            <FaTrophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.partidas_count > 0 
               ? Math.round(((stats.gols + stats.assistencias) / stats.partidas_count) * 100) / 100 
               : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Gols + Assists por jogo
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Melhor Companheiro - Featured Card */}
      {stats.melhor_garcom && (
        <Card className="bg-gradient-to-r from-background to-muted/20 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FaUserFriends className="text-primary" /> Sua Melhor Dupla
            </CardTitle>
            <CardDescription>
              O jogador que mais contribuiu para seus gols
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 md:h-40 md:w-40 border-4 border-background shadow-xl rounded-full bg-background">
                <AvatarImage 
                  src={stats.melhor_garcom.imagem_perfil || undefined} 
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl bg-muted">
                  {stats.melhor_garcom.nome[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center md:text-left flex-1">
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 mb-2">
                  <h3 className="text-3xl font-bold">{stats.melhor_garcom.nome}</h3>
                  <Badge className="text-base px-3 py-1 bg-primary/20 text-primary hover:bg-primary/30 border-primary/20">
                    Garçom de Elite
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-6 max-w-lg">
                  Essa é a parceria que dá certo! {stats.melhor_garcom.nome} já te deixou na cara do gol {stats.melhor_garcom.assistencias} vezes.
                </p>

                <div className="flex justify-center md:justify-start gap-8">
                   <div className="text-center">
                     <p className="text-4xl font-bold text-primary">{stats.melhor_garcom.assistencias}</p>
                     <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-1">Assistências para você</p>
                   </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
