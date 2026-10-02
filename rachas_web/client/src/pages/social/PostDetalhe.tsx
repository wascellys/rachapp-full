import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { FaArrowLeft } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/social/PostCard";
import { SocialNav } from "@/components/social/SocialNav";
import { mensagemErro } from "@/lib/format";
import { social, type PostSocial } from "@/lib/social";

/** Um post sozinho, com comentários abertos (destino de links compartilhados e notificações). */
export default function SocialPostDetalhe() {
  const [, params] = useRoute("/social/post/:id");
  const [, setLocation] = useLocation();
  const [post, setPost] = useState<PostSocial | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    setPost(null);
    social
      .post(params.id)
      .then(setPost)
      .catch(e => setErro(e?.response?.status === 404 ? "Este post não existe ou você não tem acesso a ele." : mensagemErro(e)));
  }, [params?.id]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SocialNav />
      <Link href="/social" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
        <FaArrowLeft aria-hidden /> Voltar ao feed
      </Link>
      {erro ? (
        <p className="rounded-3xl border-2 border-dashed border-border p-10 text-center font-bold text-muted-foreground">{erro}</p>
      ) : !post ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : (
        <PostCard post={post} comentariosAbertos onAtualizado={setPost} onRemovido={() => setLocation("/social")} />
      )}
    </div>
  );
}
