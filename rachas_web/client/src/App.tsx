import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RachaDetails from "./pages/RachaDetails";
import Solicitacoes from "./pages/Solicitacoes";
import NovoRacha from "./pages/NovoRacha";
import EntrarRacha from "./pages/EntrarRacha";
import EditarRacha from "./pages/EditarRacha";
import Perfil from "./pages/Perfil";
import NovaPartida from "./pages/NovaPartida";
import GerenciarPartida from "./pages/GerenciarPartida";
import TimelinePartida from "./pages/TimelinePartida";
import Dashboard from "./pages/Dashboard";
import RankingGlobal from "./pages/RankingGlobal";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Rotas Protegidas */}
      <Route path="/">
        <Layout>
          <Home />
        </Layout>
      </Route>

      <Route path="/dashboard">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>

      <Route path="/novo-racha">
        <Layout>
          <NovoRacha />
        </Layout>
      </Route>

      <Route path="/entrar-racha">
        <Layout>
          <EntrarRacha />
        </Layout>
      </Route>
      
      <Route path="/racha/:id">
        <Layout>
          <RachaDetails />
        </Layout>
      </Route>

      <Route path="/racha/:id/editar">
        <Layout>
          <EditarRacha />
        </Layout>
      </Route>

      <Route path="/racha/:id/nova-partida">
        <Layout>
          <NovaPartida />
        </Layout>
      </Route>

      <Route path="/partida/:id/gerenciar">
        <Layout>
          <GerenciarPartida />
        </Layout>
      </Route>

      <Route path="/partida/:id/timeline">
        <Layout>
          <TimelinePartida />
        </Layout>
      </Route>

      <Route path="/perfil">
        <Layout>
          <Perfil />
        </Layout>
      </Route>

      <Route path="/ranking">
        <Layout>
          <RankingGlobal />
        </Layout>
      </Route>

      <Route path="/solicitacoes">
        <Layout>
          <Solicitacoes />
        </Layout>
      </Route>

      <Route path="/premios">
        <Layout>
          <div>Prêmios em breve</div>
        </Layout>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
