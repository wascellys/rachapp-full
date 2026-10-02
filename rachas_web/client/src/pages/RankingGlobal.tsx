import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaTrophy } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerCardModal } from "@/components/PlayerCardModal";
import { Podio } from "@/components/Stats";
import { iniciais, mensagemErro, nomeCurto, posicaoLabel } from "@/lib/format";
import type { PlayerCardData } from "@/lib/playerRating";

interface RankingGlobalItem {
  posicao: number;
  jogador_id: string;
  jogador_nome: string;
  jogador_username: string;
  jogador_imagem_perfil: string | null;
  posicao_campo: string;
  pontos: number;
  gols: number;
  assistencias: number;
  presencas: number;
}

function carta(item: RankingGlobalItem): PlayerCardData {
  return {
    name: item.jogador_nome,
    username: item.jogador_username,
    position: item.posicao_campo,
    points: item.pontos,
    rank: item.posicao,
    stats: { matches: item.presencas ?? 0, goals: item.gols, assists: item.assistencias },
    photo: item.jogador_imagem_perfil,
  };
}

export default function RankingGlobal() {
  const [ranking, setRanking] = useState<RankingGlobalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/usuarios/ranking_global/")
      .then(res => setRanking(res.data))
      .catch(error => setErro(mensagemErro(error, "Não foi possível carregar o ranking.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56 rounded-xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <FaTrophy className="text-gold" aria-hidden /> Ranking Global
        </h1>
        <p className="text-muted-foreground">Os maiores participantes em gols de todos os rachas do RachApp.</p>
      </div>

      {erro ? (
        <Card><CardContent className="py-10 text-center font-bold text-destructive">{erro}</CardContent></Card>
      ) : ranking.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Ainda não há dados suficientes para o ranking.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <Podio
                unidade="pts"
                itens={ranking.slice(0, 3).map(r => ({
                  id: r.jogador_id,
                  nome: r.jogador_nome,
                  foto: r.jogador_imagem_perfil,
                  valor: r.pontos,
                  detalhe: `${r.gols} G · ${r.assistencias} A`,
                }))}
                wrap={(item, node) => {
                  const r = ranking.find(x => x.jogador_id === item.id)!;
                  return <PlayerCardModal player={carta(r)} className="w-full min-w-0">{node}</PlayerCardModal>;
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classificação geral</CardTitle>
              <CardDescription>Pontos = gols + assistências, somando todos os rachas.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="w-12 pb-3 pl-4 sm:pl-2">#</th>
                      <th className="pb-3">Jogador</th>
                      <th className="pb-3 text-center">Pts</th>
                      <th className="hidden pb-3 text-center sm:table-cell">Jogos</th>
                      <th className="hidden pb-3 text-center sm:table-cell">Gols</th>
                      <th className="hidden pb-3 pr-2 text-center sm:table-cell">Assist.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map(item => (
                      <tr key={item.jogador_id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
                        <td className="py-3 pl-4 text-sm font-black tabular-nums text-muted-foreground sm:pl-2">{item.posicao}º</td>
                        <td className="w-full max-w-0 py-3">
                          <PlayerCardModal player={carta(item)}>
                            <div className="flex items-center gap-3 pr-2">
                              <Avatar className="size-10 shrink-0 rounded-full border-2 border-border bg-muted">
                                <AvatarImage src={item.jogador_imagem_perfil || undefined} className="object-cover" />
                                <AvatarFallback className="bg-primary/15 text-xs font-black text-primary">{iniciais(item.jogador_nome)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-bold" title={item.jogador_nome}>
                                  <span className="sm:hidden">{nomeCurto(item.jogador_nome)}</span>
                                  <span className="hidden sm:inline">{item.jogador_nome}</span>
                                </p>
                                <p className="truncate text-xs font-semibold text-muted-foreground">
                                  <span className="sm:hidden">{item.gols}G · {item.assistencias}A</span>
                                  <span className="hidden sm:inline">{posicaoLabel(item.posicao_campo)}</span>
                                </p>
                              </div>
                            </div>
                          </PlayerCardModal>
                        </td>
                        <td className="py-3 text-center text-lg font-black tabular-nums text-primary">{item.pontos}</td>
                        <td className="hidden py-3 text-center tabular-nums text-muted-foreground sm:table-cell">{item.presencas}</td>
                        <td className="hidden py-3 text-center tabular-nums text-muted-foreground sm:table-cell">{item.gols}</td>
                        <td className="hidden py-3 pr-2 text-center tabular-nums text-muted-foreground sm:table-cell">{item.assistencias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
