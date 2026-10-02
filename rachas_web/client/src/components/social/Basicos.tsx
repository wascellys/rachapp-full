import { Fragment } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatarNome, iniciais } from "@/lib/format";
import type { Mencao, UsuarioSocial } from "@/lib/social";

/** Foto do usuário com link para o perfil. */
export function AvatarUsuario({ usuario, className, link = true }: { usuario: UsuarioSocial; className?: string; link?: boolean }) {
  const avatar = (
    <Avatar className={cn("size-10 shrink-0 rounded-full border-2 border-border bg-muted", className)}>
      <AvatarImage src={usuario.imagem_perfil || undefined} className="object-cover" />
      <AvatarFallback className="bg-primary/15 text-xs font-black text-primary">{iniciais(formatarNome(usuario.nome))}</AvatarFallback>
    </Avatar>
  );
  return link ? (
    <Link href={`/social/perfil/${usuario.username}`} aria-label={`Perfil de ${formatarNome(usuario.nome)}`} className="shrink-0">
      {avatar}
    </Link>
  ) : (
    avatar
  );
}

/** Nome do usuário (com reticências) linkando para o perfil. */
export function NomeUsuario({ usuario, className }: { usuario: UsuarioSocial; className?: string }) {
  const nome = formatarNome(usuario.nome);
  return (
    <Link href={`/social/perfil/${usuario.username}`} className={cn("truncate font-bold hover:underline", className)} title={nome}>
      {nome}
    </Link>
  );
}

const MENCAO_RE = /(^|[^\w@])@([\w.+-]+)/g;

/**
 * Texto de post/comentário com as menções válidas (@usuario) virando link para o perfil.
 * Menções a usuários que não existem ficam como texto comum.
 */
export function TextoComMencoes({ texto, mencoes, className }: { texto: string; mencoes: Mencao[]; className?: string }) {
  const validos = new Map(mencoes.map(m => [m.username.toLowerCase(), m.username]));
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  const re = new RegExp(MENCAO_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const [, antes, bruto] = m;
    const nome = bruto.replace(/[.+-]+$/, "");
    const username = validos.get(nome.toLowerCase());
    if (!username) continue;
    const inicio = (m.index ?? 0) + antes.length;
    partes.push(texto.slice(ultimo, inicio));
    partes.push(
      <Link key={inicio} href={`/social/perfil/${username}`} className="font-bold text-primary hover:underline">
        @{nome}
      </Link>,
    );
    ultimo = inicio + 1 + nome.length;
  }
  partes.push(texto.slice(ultimo));
  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {partes.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </p>
  );
}
