import { Button } from "@/components/ui/button";
import { FaFutbol } from "react-icons/fa";
import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-4xl text-primary">
          <FaFutbol aria-hidden />
        </div>
        <h1 className="text-6xl font-black tracking-tight">404</h1>
        <h2 className="text-xl font-extrabold">Bola fora!</h2>
        <p className="text-muted-foreground">A página que você procura não existe ou foi removida.</p>
        <Button onClick={() => setLocation("/")}>
          <Home className="size-4" /> Voltar para o início
        </Button>
      </div>
    </div>
  );
}
