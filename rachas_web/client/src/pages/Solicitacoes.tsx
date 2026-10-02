import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaCheck, FaTimes, FaUserClock, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'sonner';
import { formatarData, iniciais, mensagemErro, nomeCompleto, posicaoLabel } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

interface Solicitacao {
  id: string;
  racha: {
    id: string;
    nome: string;
  };
  jogador: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    posicao: string;
    imagem_perfil: string | null;
  };
  status: string;
  criado_em: string;
}

export default function Solicitacoes() {
  const [recebidas, setRecebidas] = useState<Solicitacao[]>([]);
  const [enviadas, setEnviadas] = useState<Solicitacao[]>([]); // New state for sent requests
  const [loading, setLoading] = useState(true);

  const fetchSolicitacoes = async () => {
    try {
      // Fetch Recebidas (default)
      const resRecebidas = await api.get('/solicitacoes/');
      const listaRecebidas = Array.isArray(resRecebidas.data) ? resRecebidas.data : resRecebidas.data.results || [];
      const pendentesRecebidas = listaRecebidas.filter((s: Solicitacao) => s.status === 'PENDENTE');
      setRecebidas(pendentesRecebidas);

      // Fetch Enviadas
      const resEnviadas = await api.get('/solicitacoes/?tipo=enviadas');
      const dataEnviadas = resEnviadas.data.results || resEnviadas.data;
      setEnviadas(Array.isArray(dataEnviadas) ? dataEnviadas : []);

    } catch (error) {
      toast.error(mensagemErro(error, 'Erro ao carregar solicitações.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const [processando, setProcessando] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'aprovar' | 'negar') => {
    setProcessando(id);
    try {
      await api.post(`/solicitacoes/${id}/${action}/`);
      toast.success(`Solicitação ${action === 'aprovar' ? 'aprovada' : 'negada'} com sucesso!`);
      fetchSolicitacoes(); // Recarregar lista
    } catch (error) {
      toast.error(mensagemErro(error, `Erro ao ${action} solicitação.`));
    } finally {
      setProcessando(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE': return <Badge variant="warning">⏳ Pendente</Badge>;
      case 'ACEITO': return <Badge variant="live">✓ Aceito</Badge>;
      case 'NEGADO': return <Badge variant="danger">✕ Negado</Badge>;
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Solicitações</h1>
        <p className="text-muted-foreground">Gerencie pedidos de entrada e acompanhe suas solicitações.</p>
      </div>

      <Tabs defaultValue="recebidas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="recebidas" className="relative">
            Para Aprovar
            {recebidas.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {recebidas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="enviadas">
            Minhas Solicitações
            {enviadas.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {enviadas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recebidas" className="mt-0">
          {recebidas.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FaUserClock className="text-muted-foreground text-2xl" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nenhuma solicitação pendente</h3>
                <p className="text-muted-foreground max-w-sm">
                  Você não tem novas solicitações de entrada para analisar no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recebidas.map((solicitacao) => (
                <Card key={solicitacao.id} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-muted/30">
                    <div className="flex justify-between items-start gap-2">
                      <Badge variant="outline" className="min-w-0 max-w-full bg-background" title={solicitacao.racha.nome}>
                        <span className="truncate">{solicitacao.racha.nome}</span>
                      </Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatarData(solicitacao.criado_em)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-12 w-12 shrink-0 bg-background rounded-full" >
                        <AvatarImage src={solicitacao.jogador.imagem_perfil || ''} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {iniciais(nomeCompleto(solicitacao.jogador))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold text-lg" title={nomeCompleto(solicitacao.jogador)}>
                          {nomeCompleto(solicitacao.jogador)}
                        </h4>
                        <p className="truncate text-sm text-muted-foreground">@{solicitacao.jogador.username} • {posicaoLabel(solicitacao.jogador.posicao)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="w-full border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleAction(solicitacao.id, 'negar')}
                        disabled={processando === solicitacao.id}
                      >
                        <FaTimes className="mr-2" /> Negar
                      </Button>
                      <Button
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => handleAction(solicitacao.id, 'aprovar')}
                        disabled={processando === solicitacao.id}
                      >
                        <FaCheck className="mr-2" /> Aprovar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enviadas" className="mt-0">
          {enviadas.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FaPaperPlane className="text-muted-foreground text-2xl" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nenhuma solicitação enviada</h3>
                <p className="text-muted-foreground max-w-sm">
                  Você ainda não enviou solicitações para entrar em outros rachas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {enviadas.map((s) => (
                <div key={s.id} className="flex justify-between items-center gap-3 p-4 border rounded-lg bg-card shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-lg" title={s.racha.nome}>{s.racha.nome}</p>
                    <p className="text-sm text-muted-foreground">Enviada em {formatarData(s.criado_em)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {getStatusBadge(s.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
