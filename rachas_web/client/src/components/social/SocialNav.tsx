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
    { href: "/social", label: "Feed", curto: "Feed", icon: FaHome, ativo: location === "/social" || location.startsWith("/social/post") },
    { href: "/social/reels", label: "Reels", curto: "Reels", icon: FaFilm, ativo: location.startsWith("/social/reels") },
    { href: "/social/amigos", label: "Amigos", curto: "Amigos", icon: FaUserFriends, ativo: location.startsWith("/social/amigos"), badge: resumo.pedidos_amizade },
    { href: "/social/notificacoes", label: "Notificações", curto: "Avisos", icon: FaBell, ativo: location.startsWith("/social/notificacoes"), badge: resumo.notificacoes_nao_lidas },
    { href: meuPerfil, label: "Perfil", curto: "Perfil", icon: FaUserCircle, ativo: location === meuPerfil },
  ];

  return (
    <nav aria-label="Rede social" className="mb-5">
      {/* Celular: 5 colunas que cabem na tela (ícone + nome curto); a partir de sm: pílulas em linha */}
      <ul className="grid grid-cols-5 gap-1 rounded-3xl border-2 border-border bg-card p-1 sm:flex sm:rounded-full">
        {itens.map(i => (
          <li key={i.href} className="min-w-0 sm:flex-1">
            <Link
              href={i.href}
              aria-current={i.ativo ? "page" : undefined}
              aria-label={i.badge ? `${i.label} (${i.badge} novos)` : i.label}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-extrabold transition-colors sm:flex-row sm:gap-2 sm:rounded-full sm:px-3 sm:py-2 sm:text-sm",
                i.ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <i.icon aria-hidden className="text-base sm:text-sm" />
              <span className="max-w-full truncate sm:hidden">{i.curto}</span>
              <span className="hidden sm:inline">{i.label}</span>
              {!!i.badge && (
                <span
                  className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black text-white sm:static sm:h-5 sm:min-w-5 sm:text-[10px]"
                  aria-label={`${i.badge} novos`}
                >
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
