import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaCheck, FaSearch, FaTimes, FaUserCheck, FaUserClock, FaUserPlus } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarUsuario, NomeUsuario } from "@/components/social/Basicos";
import { SocialNav } from "@/components/social/SocialNav";
import { mensagemErro, posicaoLabel } from "@/lib/format";
import { social, type AmigoItem, type UsuarioComAmizade, type UsuarioSocial } from "@/lib/social";

type Amizades = { amigos: AmigoItem[]; recebidas: AmigoItem[]; enviadas: AmigoItem[] };

export default function SocialAmigos() {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<UsuarioComAmizade[] | null>(null);
  const [amizades, setAmizades] = useState<Amizades | null>(null);

  const recarregar = async () => {
    try {
      setAmizades(await social.amizades());
    } catch (error) {
      toast.error(mensagemErro(error));
    }
  };

  useEffect(() => {
    recarregar();
  }, []);

  // Busca com atraso; vazia = sugestões de colegas de racha
  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(() => {
      social.buscar(busca.trim()).then(r => !cancelado && setResultados(r)).catch(() => !cancelado && setResultados([]));
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busca]);

  const agir = async (acao: () => Promise<unknown>, msg: string) => {
    try {
      await acao();
      toast.success(msg);
      await recarregar();
      setResultados(await social.buscar(busca.trim()));
    } catch (error) {
      toast.error(mensagemErro(error, "Não foi possível concluir."));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SocialNav />

      <div className="relative">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar jogadores de todos os rachas"
          className="h-12 rounded-full pl-11"
          aria-label="Buscar jogadores"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{busca.trim() ? "Resultados" : "Pessoas dos seus rachas"}</CardTitle>
        </CardHeader>
        <CardContent>
          {resultados === null ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : resultados.length === 0 ? (
            <p className="text-sm text-muted-foreground">{busca.trim() ? "Ninguém encontrado." : "Sem sugestões por enquanto."}</p>
          ) : (
            <ul className="space-y-2">
              {resultados.map(u => (
                <Linha key={u.id} usuario={u}>
                  {u.amizade === "nenhuma" && (
                    <Button size="sm" onClick={() => agir(() => social.pedirAmizade(u.id), "Pedido enviado!")} aria-label={`Adicionar ${u.nome}`}>
                      <FaUserPlus /> Adicionar
                    </Button>
                  )}
                  {u.amizade === "enviada" && (
                    <Button size="sm" variant="outline" onClick={() => agir(() => social.removerAmizade(u.amizade_id!), "Pedido cancelado.")}>
                      <FaUserClock /> Enviado
                    </Button>
                  )}
                  {u.amizade === "recebida" && (
                    <Button size="sm" onClick={() => agir(() => social.aceitarAmizade(u.amizade_id!), "Agora vocês são amigos!")}>
                      <FaCheck /> Aceitar
                    </Button>
                  )}
                  {u.amizade === "amigos" && (
                    <span className="flex items-center gap-1 text-sm font-bold text-primary"><FaUserCheck /> Amigos</span>
                  )}
                </Linha>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {amizades && amizades.recebidas.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>Pedidos de amizade ({amizades.recebidas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {amizades.recebidas.map(a => (
                <Linha key={a.amizade_id} usuario={a}>
                  <Button size="sm" onClick={() => agir(() => social.aceitarAmizade(a.amizade_id), "Agora vocês são amigos!")} aria-label={`Aceitar ${a.nome}`}>
                    <FaCheck /> Aceitar
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => agir(() => social.removerAmizade(a.amizade_id), "Pedido recusado.")} aria-label={`Recusar ${a.nome}`}>
                    <FaTimes />
                  </Button>
                </Linha>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {amizades && amizades.enviadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {amizades.enviadas.map(a => (
                <Linha key={a.amizade_id} usuario={a}>
                  <Button size="sm" variant="outline" onClick={() => agir(() => social.removerAmizade(a.amizade_id), "Pedido cancelado.")}>
                    Cancelar
                  </Button>
                </Linha>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meus amigos {amizades ? `(${amizades.amigos.length})` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          {!amizades ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : amizades.amigos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não tem amigos aqui. Busque pelo nome acima.</p>
          ) : (
            <ul className="space-y-2" data-testid="lista-amigos">
              {amizades.amigos.map(a => (
                <Linha key={a.amizade_id} usuario={a} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Linha({ usuario, children }: { usuario: UsuarioSocial; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border-2 border-border p-3">
      <AvatarUsuario usuario={usuario} />
      <div className="min-w-0 flex-1">
        <NomeUsuario usuario={usuario} className="block" />
        <p className="truncate text-xs font-semibold text-muted-foreground">
          @{usuario.username}
          {usuario.posicao ? ` · ${posicaoLabel(usuario.posicao)}` : ""}
        </p>
      </div>
      {children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
    </li>
  );
}
