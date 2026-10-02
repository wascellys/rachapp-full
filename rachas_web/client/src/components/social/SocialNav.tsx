import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { FaBell, FaFilm, FaHome, FaUserCircle, FaUserFriends } from "react-icons/fa";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/** Abas da rede social: Feed, Reels, Amigos, Notificações e Meu perfil. */
export function SocialNav() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [resumo, setResumo] = useState({ notificacoes_nao_lidas: 0, pedidos_amizade: 0 });

  useEffect(() => {
    api.get("/social/resumo/").then(r => setResumo(r.data)).catch(() => {});
  }, [location]);

  const meuPerfil = `/social/perfil/${user?.username ?? ""}`;
  const itens = [
    { href: "/social", label: "Feed", icon: FaHome, ativo: location === "/social" || location.startsWith("/social/post") },
    { href: "/social/reels", label: "Reels", icon: FaFilm, ativo: location.startsWith("/social/reels") },
    { href: "/social/amigos", label: "Amigos", icon: FaUserFriends, ativo: location.startsWith("/social/amigos"), badge: resumo.pedidos_amizade },
    { href: "/social/notificacoes", label: "Notificações", icon: FaBell, ativo: location.startsWith("/social/notificacoes"), badge: resumo.notificacoes_nao_lidas },
    { href: meuPerfil, label: "Perfil", icon: FaUserCircle, ativo: location === meuPerfil },
  ];

  return (
    <nav aria-label="Rede social" className="-mx-4 mb-5 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max min-w-full gap-1 rounded-full border-2 border-border bg-card p-1 md:min-w-0">
        {itens.map(i => (
          <li key={i.href} className="flex-1">
            <Link
              href={i.href}
              aria-current={i.ativo ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-extrabold transition-colors",
                i.ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <i.icon aria-hidden /> <span>{i.label}</span>
              {!!i.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-black text-white" aria-label={`${i.badge} novos`}>
                  {i.badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
