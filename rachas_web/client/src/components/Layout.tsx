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
  FaChevronLeft,
  FaChevronRight,
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
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Se não estiver autenticado e tentar acessar rota protegida, redirecionar (lógica simplificada)
    // Em uma app real, verificaríamos se a rota atual é pública
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

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? "w-20" : "w-64"
          } p-4`}
      >
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} mb-8 px-2`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                <FaFutbol className="text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground overflow-hidden whitespace-nowrap">
                Rach<span className="text-primary">App</span>
              </h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            <FaBars />
          </Button>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer group relative ${location === item.path
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative">
                  <item.icon className="shrink-0 text-xl" />
                  {/* Badge for Collapsed State */}
                  {collapsed && (item as any).badge > 0 && (
                    <span className="absolute -top-2 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {(item as any).badge}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <div className="flex flex-1 items-center justify-between">
                    <span>{item.label}</span>
                    {/* Badge for Expanded State */}
                    {(item as any).badge > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                        {(item as any).badge}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className={`pt-4 border-t border-border ${collapsed ? "flex justify-center" : ""}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer ${collapsed ? "justify-center" : ""}`}>
                  <Avatar className="rounded-full bg-background h-8 w-8">
                    <AvatarImage src={user?.imagem_perfil || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.first_name?.charAt(0) || user?.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {user?.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.posicao}
                      </p>
                    </div>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" side={collapsed ? "right" : "top"}>
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/perfil">
                  <DropdownMenuItem className="cursor-pointer">
                    <FaUserCircle className="mr-2" /> Perfil
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer"
                >
                  <FaSignOutAlt className="mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <FaFutbol className="text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold">
            Rach<span className="text-primary">App</span>
          </h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer rounded-full bg-background">
              <AvatarImage src={user?.imagem_perfil || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.first_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href="/perfil">
              <DropdownMenuItem className="cursor-pointer">
                Perfil
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={logout}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 pb-24 md:p-8 md:pb-8">
        <div className="container max-w-5xl mx-auto">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-2 z-10 pb-safe">
        {navItems.map(item => (
          <Link key={item.path} href={item.path}>
            <div
              className={`flex flex-col items-center gap-1 p-2 rounded-lg ${location === item.path
                ? "text-primary"
                : "text-muted-foreground"
                }`}
            >
              <item.icon size={20} />
              <span className="text-[10px]">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
