import { useState } from "react";
import { Link } from "wouter";
import { FaCompass, FaUserFriends, FaUserPlus } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Composer } from "@/components/social/Composer";
import { PostCard } from "@/components/social/PostCard";
import { SocialNav } from "@/components/social/SocialNav";
import { useFeed } from "@/components/social/useFeed";
import { cn } from "@/lib/utils";

type Aba = "amigos" | "explorar";

export default function SocialFeed() {
  const [aba, setAba] = useState<Aba>("amigos");
  const feed = useFeed({ feed: aba });

  return (
    <div className="mx-auto max-w-2xl">
      <SocialNav />
      <div className="space-y-4">
        <Composer
          onPublicado={post => {
            if (aba === "amigos" || post.visibilidade === "PUBLICO") feed.adicionar(post);
          }}
        />

        <div className="flex gap-2" role="tablist" aria-label="Escolher feed">
          {([
            ["amigos", "Amigos", FaUserFriends],
            ["explorar", "Explorar", FaCompass],
          ] as const).map(([valor, label, Icone]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={aba === valor}
              onClick={() => setAba(valor)}
              className={cn(
                "flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm font-extrabold transition-colors",
                aba === valor ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              <Icone aria-hidden /> {label}
            </button>
          ))}
        </div>

        {feed.erro && <p className="rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive">{feed.erro}</p>}

        {feed.posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onRemovido={feed.remover}
            onAtualizado={feed.atualizar}
            onCompartilhado={novo => feed.adicionar(novo)}
          />
        ))}

        {feed.carregando && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        )}

        {!feed.carregando && feed.posts.length === 0 && !feed.erro && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border px-6 py-12 text-center">
            <p className="font-bold text-muted-foreground">
              {aba === "amigos" ? "Seu feed está vazio. Adicione amigos ou publique algo!" : "Ninguém publicou nada ainda."}
            </p>
            {aba === "amigos" && (
              <Link href="/social/amigos">
                <Button variant="outline"><FaUserPlus /> Encontrar amigos</Button>
              </Link>
            )}
          </div>
        )}

        <div ref={feed.sentinela} aria-hidden className="h-1" />
        {feed.temMais && !feed.carregando && feed.posts.length > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={feed.maisUma}>Carregar mais</Button>
          </div>
        )}
      </div>
    </div>
  );
}
