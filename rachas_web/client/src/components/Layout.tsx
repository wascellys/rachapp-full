import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import {
  FaFutbol,
  FaTrophy,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaUserCircle,
  FaBars,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  /* New logic for badge */
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      if (isAuthenticated) {
        try {
          const res = await api.get('/solicitacoes/');
          // Filter strictly for 'PENDENTE' in the default list (received requests)
          const count = res.data.results
            ? res.data.results.filter((s: any) => s.status === 'PENDENTE').length
            : res.data.filter((s: any) => s.status === 'PENDENTE').length;
          setPendingCount(count);
        } catch (e) {
          console.error("Failed to fetch pending requests count", e);
        }
      }
    };

    if (!loading && isAuthenticated) {
      fetchCount();
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <FaFutbol className="text-primary text-2xl animate-spin" style={{ animationDuration: '1.5s' }} />
          </div>
          <p className="text-muted-foreground font-bold text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location !== "/login" && location !== "/register") {
      window.location.href = "/login";
      return null;
    }
    return <>{children}</>;
  }

  const navItems = [
    { path: "/", label: "Meus Rachas", icon: FaFutbol },
    { path: "/dashboard", label: "Dashboard", icon: FaChartBar },
    { path: "/solicitacoes", label: "Solicitações", icon: FaUsers, badge: pendingCount },
    { path: "/ranking", label: "Ranking Global", icon: FaTrophy },
  ];

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* ===== Sidebar Desktop ===== */}
      <aside
        className={`hidden md:flex flex-col border-r-2 border-border bg-card transition-all duration-300 h-screen sticky top-0 shrink-0 ${
          collapsed ? "w-20" : "w-64"
        } p-3`}
      >
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} mb-6 px-1`}>
          {!collapsed && (
            <div className="flex items-center gap-2 pl-1">
              <div className="w-9 h-9 bg-primary rounded-2xl flex items-center justify-center shrink-0 shadow-[0_3px_0_oklch(0.45_0.22_142)]">
                <FaFutbol className="text-primary-foreground text-sm" />
              </div>
              <h1 className="text-xl font-black text-foreground overflow-hidden whitespace-nowrap tracking-tight">
                Rach<span className="text-primary">App</span>
              </h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expandir" : "Recolher"}
            className="rounded-xl shrink-0"
          >
            <FaBars />
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-all cursor-pointer group relative font-bold ${
                    active
                      ? "bg-primary/12 text-primary border-l-4 border-primary pl-2"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="relative shrink-0">
                    <item.icon className={`text-lg ${active ? "text-primary" : ""}`} />
                    {/* Badge collapsed */}
                    {collapsed && (item as any).badge > 0 && (
                      <span className="absolute -top-2 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] text-white font-black shadow-[0_2px_0_oklch(0.38_0.18_25)]">
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-sm">{item.label}</span>
                      {/* Badge expanded */}
                      {(item as any).badge > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 h-5 min-w-5 rounded-full p-0 px-1.5 flex items-center justify-center text-[10px] badge-pulse"
                        >
                          {(item as any).badge}
                        </Badge>
                      )}
                    </div>
                  )}
                  {/* Active indicator dot (collapsed) */}
                  {active && collapsed && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="mt-auto">
          <div className={`pt-3 border-t-2 border-border ${collapsed ? "flex justify-center" : ""}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className={`flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-muted cursor-pointer transition-colors ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <Avatar className="rounded-2xl bg-primary/15 h-9 w-9 shrink-0">
                    <AvatarImage src={user?.imagem_perfil || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-black rounded-2xl">
                      {user?.first_name?.charAt(0) || user?.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-extrabold truncate">
                        {user?.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-semibold">
                        {user?.posicao}
                      </p>
                    </div>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-2" side={collapsed ? "right" : "top"}>
                <DropdownMenuLabel className="font-black">Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/perfil">
                  <DropdownMenuItem className="cursor-pointer rounded-xl font-bold">
                    <FaUserCircle className="mr-2" /> Perfil
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer rounded-xl font-bold text-destructive focus:text-destructive"
                >
                  <FaSignOutAlt className="mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* ===== Mobile Header ===== */}
      {/* paddingTop = status bar height + espaçamento base (py-3 = 0.75rem) */}
      <header
        className="md:hidden flex items-center justify-between px-4 border-b-2 border-border bg-card sticky top-0 z-20"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
          paddingBottom: '0.75rem',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-[0_2px_0_oklch(0.45_0.22_142)]">
            <FaFutbol className="text-primary-foreground text-xs" />
          </div>
          <h1 className="text-lg font-black tracking-tight">
            Rach<span className="text-primary">App</span>
          </h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer rounded-xl bg-primary/15 shrink-0">
              <AvatarImage src={user?.imagem_perfil || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground font-black rounded-xl text-sm">
                {user?.first_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-2">
            <Link href="/perfil">
              <DropdownMenuItem className="cursor-pointer rounded-xl font-bold">
                <FaUserCircle className="mr-2" /> Perfil
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer rounded-xl font-bold text-destructive focus:text-destructive"
            >
              <FaSignOutAlt className="mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ===== Main Content ===== */}
      <main className="flex-1 overflow-auto p-4 pb-28 md:p-8 md:pb-8">
        <div className="container max-w-5xl mx-auto">{children}</div>
      </main>

      {/* ===== Mobile Bottom Nav ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border z-20 pb-safe">
        <div className="flex justify-around items-center px-2 py-1">
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {/* Active bar indicator */}
                  {active && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary" />
                  )}
                  <div className="relative">
                    <item.icon size={active ? 22 : 20} className={`transition-all ${active ? "drop-shadow-[0_0_6px_var(--primary)]" : ""}`} />
                    {/* Notification dot */}
                    {(item as any).badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] text-white font-black">
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-extrabold transition-all ${active ? "text-primary" : ""}`}>
                    {item.label.split(" ")[0]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
