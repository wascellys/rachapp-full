import { useEffect, useState } from "react";
import { Link } from "wouter";
import { FaBell } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarUsuario } from "@/components/social/Basicos";
import { SocialNav } from "@/components/social/SocialNav";
import { formatarNome } from "@/lib/format";
import { social, tempoRelativo, TEXTO_NOTIFICACAO, type Notificacao } from "@/lib/social";
import { cn } from "@/lib/utils";

export default function SocialNotificacoes() {
  const [itens, setItens] = useState<Notificacao[] | null>(null);

  useEffect(() => {
    social
      .notificacoes()
      .then(res => {
        setItens(res.itens);
        // Abriu a tela = viu tudo; a marcação de "não lida" continua visível nesta visita
        if (res.nao_lidas > 0) social.lerNotificacoes().catch(() => {});
      })
      .catch(() => setItens([]));
  }, []);

  const destino = (n: Notificacao) =>
    n.tipo === "AMIZADE_PEDIDO" ? "/social/amigos" : n.post_id ? `/social/post/${n.post_id}` : `/social/perfil/${n.ator.username}`;

  return (
    <div className="mx-auto max-w-2xl">
      <SocialNav />
      {itens === null ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border p-12 text-center">
          <FaBell className="text-3xl text-muted-foreground" aria-hidden />
          <p className="font-bold text-muted-foreground">Nenhuma notificação ainda.</p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="notificacoes">
          {itens.map(n => (
            <li key={n.id}>
              <Link
                href={destino(n)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border-2 p-3 transition-colors hover:border-primary/50",
                  n.lida ? "border-border bg-card" : "border-primary/40 bg-primary/10",
                )}
              >
                <AvatarUsuario usuario={n.ator} link={false} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">
                    <strong>{formatarNome(n.ator.nome)}</strong> {TEXTO_NOTIFICACAO[n.tipo]}
                    {n.comentario_texto && <span className="text-muted-foreground">: “{n.comentario_texto}”</span>}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">{tempoRelativo(n.criado_em)}</p>
                </div>
                {!n.lida && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
