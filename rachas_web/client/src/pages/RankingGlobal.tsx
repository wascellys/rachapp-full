
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FaTrophy, FaMedal } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerCardModal } from "@/components/PlayerCardModal";

interface RankingGlobalItem {
  posicao: number;
  jogador_id: string;
  jogador_nome: string;
  jogador_imagem_perfil: string | null;
  posicao_campo: string;
  pontos: number;
  gols: number;
  assistencias: number;
}

export default function RankingGlobal() {
  const [ranking, setRanking] = useState<RankingGlobalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await api.get("/usuarios/ranking_global/");
        setRanking(response.data);
      } catch (error) {
        console.error("Erro ao carregar ranking global:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  const getMedalColor = (posicao: number) => {
    switch (posicao) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48 rounded-md" />
        <Card>
          <CardContent className="p-0">
             <div className="space-y-4 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FaTrophy className="text-primary" /> Ranking Global
        </h1>
        <p className="text-muted-foreground">
          Os melhores jogadores de todos os tempos em todos os rachas.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg">
             Classificação Geral (Gols + Assistências)
          </CardTitle>
          <CardDescription>
             Atualizado em tempo real com base em todas as partidas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {ranking.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Ainda não há dados suficientes para o ranking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground bg-muted/20">
                    <th className="py-4 pl-6 w-16 text-center">#</th>
                    <th className="py-4 px-4">Jogador</th>
                    <th className="py-4 px-4 text-center">Pts</th>
                    <th className="py-4 px-4 text-center hidden sm:table-cell">Gols</th>
                    <th className="py-4 px-4 text-center hidden sm:table-cell">Assists</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((item) => (
                    <tr
                      key={item.jogador_id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-4 pl-6 text-center">
                        {item.posicao <= 3 ? (
                           <FaMedal className={`w-6 h-6 mx-auto ${getMedalColor(item.posicao)}`} />
                        ) : (
                           <span className="font-bold text-muted-foreground">{item.posicao}º</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <PlayerCardModal
                            player={{
                              name: item.jogador_nome,
                              position: item.posicao_campo || "JOG",
                              overall: item.pontos, // Usando pontos como overall "fake" no global
                              stats: {
                                matches: 0, // Não temos matches global na API ainda, então 0 ou omitir
                                goals: item.gols,
                                assists: item.assistencias,
                              },
                              photo: item.jogador_imagem_perfil,
                            }}
                          >
                          <div className="flex items-center gap-3 cursor-pointer">
                            <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-transparent group-hover:border-primary transition-all">
                              <AvatarImage src={item.jogador_imagem_perfil || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {item.jogador_nome.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                                {item.jogador_nome}
                              </div>
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 md:hidden">
                                {item.pontos} pts
                              </Badge>
                            </div>
                          </div>
                        </PlayerCardModal>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant="secondary" className="text-base font-bold px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20">
                          {item.pontos}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center hidden sm:table-cell font-medium text-muted-foreground">
                        {item.gols}
                      </td>
                      <td className="py-4 px-4 text-center hidden sm:table-cell font-medium text-muted-foreground">
                        {item.assistencias}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
