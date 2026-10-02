import api from "./api";
import { formatarData } from "./format";

export interface UsuarioSocial {
  id: string;
  username: string;
  nome: string;
  imagem_perfil: string | null;
  posicao: string;
}

export type SituacaoAmizade = "eu" | "amigos" | "enviada" | "recebida" | "nenhuma";

export interface UsuarioComAmizade extends UsuarioSocial {
  amizade: SituacaoAmizade;
  amizade_id: string | null;
}

export interface Mencao {
  id: string;
  username: string;
}

export interface PostOriginal {
  id: string;
  autor: UsuarioSocial;
  texto: string;
  midia_url: string | null;
  tipo_midia: "" | "IMAGEM" | "VIDEO";
  formato: "POST" | "REEL";
  criado_em: string;
  mencoes: Mencao[];
}

export interface PostSocial extends PostOriginal {
  visibilidade: "PUBLICO" | "AMIGOS";
  total_curtidas: number;
  total_comentarios: number;
  total_compartilhamentos: number;
  curtido: boolean;
  pode_excluir: boolean;
  eh_compartilhamento: boolean;
  original: PostOriginal | null;
}

export interface Comentario {
  id: string;
  post_id: string;
  autor: UsuarioSocial;
  texto: string;
  criado_em: string;
  mencoes: Mencao[];
  pode_excluir: boolean;
}

export interface Pagina<T> {
  count: number;
  next: string | null;
  results: T[];
}

export interface PerfilSocial extends UsuarioSocial {
  membro_desde: string;
  amizade: SituacaoAmizade;
  amizade_id: string | null;
  estatisticas: { gols: number; assistencias: number; jogos: number; rachas: number; premios: number };
  social: { amigos: number; posts: number; reels: number };
}

export interface AmigoItem extends UsuarioSocial {
  amizade_id: string;
  desde: string;
}

export interface Notificacao {
  id: string;
  tipo: "CURTIDA" | "COMENTARIO" | "MENCAO" | "COMPARTILHAMENTO" | "AMIZADE_PEDIDO" | "AMIZADE_ACEITA";
  ator: UsuarioSocial;
  post_id: string | null;
  comentario_texto: string | null;
  lida: boolean;
  criado_em: string;
}

export type Feed = "amigos" | "explorar" | "reels";

export const social = {
  feed: (params: { feed?: Feed; autor?: string; formato?: "POST" | "REEL"; page?: number }) =>
    api.get<Pagina<PostSocial>>("/social/posts/", { params }).then(r => r.data),
  post: (id: string) => api.get<PostSocial>(`/social/posts/${id}/`).then(r => r.data),
  publicar: (dados: FormData) =>
    api.post<PostSocial>("/social/posts/", dados, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data),
  apagar: (id: string) => api.delete(`/social/posts/${id}/`),
  curtir: (id: string, curtir: boolean) =>
    (curtir ? api.post(`/social/posts/${id}/curtir/`) : api.delete(`/social/posts/${id}/curtir/`)).then(
      r => r.data as { curtido: boolean; total_curtidas: number },
    ),
  comentarios: (id: string) => api.get<Comentario[]>(`/social/posts/${id}/comentarios/`).then(r => r.data),
  comentar: (id: string, texto: string) =>
    api.post<Comentario>(`/social/posts/${id}/comentarios/`, { texto }).then(r => r.data),
  apagarComentario: (id: string) => api.delete(`/social/comentarios/${id}/`),
  compartilhar: (id: string, texto: string, visibilidade: "PUBLICO" | "AMIGOS") =>
    api.post<PostSocial>(`/social/posts/${id}/compartilhar/`, { texto, visibilidade }).then(r => r.data),
  buscar: (q: string) => api.get<UsuarioComAmizade[]>("/social/usuarios/", { params: { q } }).then(r => r.data),
  perfil: (username: string) => api.get<PerfilSocial>(`/social/perfis/${encodeURIComponent(username)}/`).then(r => r.data),
  amizades: () =>
    api.get<{ amigos: AmigoItem[]; recebidas: AmigoItem[]; enviadas: AmigoItem[] }>("/social/amizades/").then(r => r.data),
  pedirAmizade: (usuarioId: string) =>
    api.post<{ amizade: SituacaoAmizade; amizade_id: string }>("/social/amizades/", { usuario_id: usuarioId }).then(r => r.data),
  aceitarAmizade: (id: string) => api.post(`/social/amizades/${id}/aceitar/`).then(r => r.data),
  removerAmizade: (id: string) => api.delete(`/social/amizades/${id}/`),
  notificacoes: () => api.get<{ nao_lidas: number; itens: Notificacao[] }>("/social/notificacoes/").then(r => r.data),
  lerNotificacoes: () => api.post("/social/notificacoes/ler/"),
};

/** "agora", "5 min", "3 h", "2 d" e, depois de uma semana, a data. */
export function tempoRelativo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d`;
  return formatarData(iso, { year: undefined });
}

/** Link público de um post (usado no "copiar link" e no compartilhamento nativo). */
export function linkDoPost(id: string) {
  return `${window.location.origin}/social/post/${id}`;
}

export const TEXTO_NOTIFICACAO: Record<Notificacao["tipo"], string> = {
  CURTIDA: "curtiu seu post",
  COMENTARIO: "comentou no seu post",
  MENCAO: "marcou você",
  COMPARTILHAMENTO: "compartilhou seu post",
  AMIZADE_PEDIDO: "quer ser seu amigo",
  AMIZADE_ACEITA: "aceitou seu pedido de amizade",
};
