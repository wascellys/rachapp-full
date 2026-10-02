import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FaFutbol, FaHandshake, FaUserFriends, FaEdit, FaTrophy, FaCalendarCheck } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerCard } from "@/components/PlayerCard";
import { BarChartCard, StatTile } from "@/components/Stats";
import { formatarData, formatarDataCurta, formatarNome, iniciais, mensagemErro, posicaoLabel } from "@/lib/format";
import { calcularRating, TIER_THEME } from "@/lib/playerRating";

interface DashboardStats {
  id: string;
  nome: string;
  username: string;
  posicao: string;
  imagem_perfil: string | null;
  data_criacao: string;
  rachas_count: number;
  partidas_count: number;
  gols: number;
  assistencias: number;
  premios: number;
  media_gols: number;
  media_assistencias: number;
  melhor_garcom: { id: string; nome: string; assistencias: number; imagem_perfil: string | null } | null;
  historico: { partida_id: string; data: string; racha_nome: string; gols: number; assistencias: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/usuarios/dashboard/")
      .then(res => setStats(res.data))
      .catch(error => setErro(mensagemErro(error, "Não foi possível carregar seu desempenho.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <Card><CardContent className="py-10 text-center font-bold text-destructive">{erro}</CardContent></Card>;
  }

  const carta = {
    name: stats.nome,
    username: stats.username,
    position: stats.posicao,
    points: stats.gols + stats.assistencias,
    stats: { matches: stats.partidas_count, goals: stats.gols, assists: stats.assistencias, awards: stats.premios },
    photo: stats.imagem_perfil,
  };
  const rating = calcularRating(carta);
  const participacao = stats.partidas_count > 0 ? ((stats.gols + stats.assistencias) / stats.partidas_count).toFixed(2) : "0";
  const historico = stats.historico.map(h => ({ data: formatarDataCurta(h.data), gols: h.gols, assistencias: h.assistencias }));

  return (
    <div className="space-y-6">
      {/* Hero com a carta */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-card p-6 md:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="pointer-events-none absolute -left-24 top-0 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center">
          <div className="rounded-3xl bg-[#07130a] px-6 pb-3 pt-6">
            <PlayerCard {...carta} />
          </div>
          <div className="w-full min-w-0 flex-1 space-y-4 text-center md:text-left">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Meu desempenho</p>
              <h1 className="truncate text-3xl font-black tracking-tight md:text-4xl" title={stats.nome}>{stats.nome}</h1>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <Badge variant="outline">{posicaoLabel(stats.posicao)}</Badge>
                <Badge variant="gold">Carta {TIER_THEME[rating.tier].label} · OVR {rating.overall}</Badge>
              </div>
            </div>
            <p className="text-muted-foreground">
              No RachApp desde {formatarData(stats.data_criacao, { day: undefined, month: "long" })} · participa de{" "}
              <strong className="text-foreground">{stats.rachas_count}</strong> {stats.rachas_count === 1 ? "racha" : "rachas"}.
            </p>
            {rating.proximoTier && (
              <div className="mx-auto max-w-sm md:mx-0">
                <div className="mb-1 flex justify-between text-xs font-bold text-muted-foreground">
                  <span>Progresso para {TIER_THEME[rating.proximoTier].label}</span>
                  <span className="tabular-nums">{Math.round(rating.progresso * 100)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(rating.progresso * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${rating.progresso * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Jogue mais, marque e dê assistências para evoluir sua carta.</p>
              </div>
            )}
            <Link href="/perfil">
              <Button variant="outline" size="sm"><FaEdit /> Editar perfil e foto</Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Jogos" value={stats.partidas_count} icon={<FaCalendarCheck />} />
        <StatTile label="Gols" value={stats.gols} hint={`${stats.media_gols} por jogo`} icon={<FaFutbol />} />
        <StatTile label="Assistências" value={stats.assistencias} hint={`${stats.media_assistencias} por jogo`} icon={<FaHandshake />} />
        <StatTile label="Prêmios" value={stats.premios} hint={`${participacao} G+A por jogo`} icon={<FaTrophy />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas últimas partidas</CardTitle>
          <CardDescription>Gols e assistências em cada jogo em que você esteve presente</CardDescription>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Quando você jogar sua primeira partida, o gráfico aparece aqui.</p>
          ) : (
            <BarChartCard
              ariaLabel="Gráfico com seus gols e assistências por partida"
              data={historico}
              xKey="data"
              series={[
                { key: "gols", label: "Gols", slot: 1 },
                { key: "assistencias", label: "Assistências", slot: 2 },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {stats.melhor_garcom && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FaUserFriends className="text-primary" aria-hidden /> Sua melhor dupla</CardTitle>
            <CardDescription>Quem mais te deixou na cara do gol</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 sm:flex-row">
            <Avatar className="size-20 rounded-full border-4 border-primary/40 bg-muted">
              <AvatarImage src={stats.melhor_garcom.imagem_perfil || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl font-black">{iniciais(formatarNome(stats.melhor_garcom.nome))}</AvatarFallback>
            </Avatar>
            <div className="w-full min-w-0 flex-1 text-center sm:text-left">
              <p className="truncate text-2xl font-black" title={formatarNome(stats.melhor_garcom.nome)}>{formatarNome(stats.melhor_garcom.nome)}</p>
              <p className="text-muted-foreground">
                Te deu <strong className="text-foreground">{stats.melhor_garcom.assistencias}</strong>{" "}
                {stats.melhor_garcom.assistencias === 1 ? "assistência" : "assistências"} para gol.
              </p>
            </div>
            <Badge variant="success" className="text-sm">Garçom de elite</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
