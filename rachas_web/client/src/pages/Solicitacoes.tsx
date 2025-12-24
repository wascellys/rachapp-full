import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FaCheck, FaTimes, FaUserClock } from 'react-icons/fa';
import { toast } from 'sonner';
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
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSolicitacoes = async () => {
    try {
      const response = await api.get('/solicitacoes/');
      // Filtrar apenas as pendentes para esta visualização
      const pendentes = response.data.results.filter((s: Solicitacao) => s.status === 'PENDENTE');
      setSolicitacoes(pendentes);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const handleAction = async (id: string, action: 'aprovar' | 'negar') => {
    try {
      await api.post(`/solicitacoes/${id}/${action}/`);
      toast.success(`Solicitação ${action === 'aprovar' ? 'aprovada' : 'negada'} com sucesso!`);
      fetchSolicitacoes(); // Recarregar lista
    } catch (error) {
      console.error(`Erro ao ${action} solicitação:`, error);
      toast.error(`Erro ao ${action} solicitação`);
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
        <h1 className="text-3xl font-bold tracking-tight">Solicitações Pendentes</h1>
        <p className="text-muted-foreground">Gerencie os pedidos de entrada nos seus rachas</p>
      </div>

      {solicitacoes.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {solicitacoes.map((solicitacao) => (
            <Card key={solicitacao.id} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-background">
                    {solicitacao.racha.nome}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(solicitacao.criado_em).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-12 w-12 bg-background rounded-full" >
                    <AvatarImage src={solicitacao.jogador.imagem_perfil || ''} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {solicitacao.jogador.first_name?.charAt(0) || solicitacao.jogador.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-lg">
                      {solicitacao.jogador.first_name} {solicitacao.jogador.last_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">@{solicitacao.jogador.username} • {solicitacao.jogador.posicao}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="w-full border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleAction(solicitacao.id, 'negar')}
                  >
                    <FaTimes className="mr-2" /> Negar
                  </Button>
                  <Button 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleAction(solicitacao.id, 'aprovar')}
                  >
                    <FaCheck className="mr-2" /> Aprovar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
