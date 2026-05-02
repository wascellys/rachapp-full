import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Capacitor } from "@capacitor/core";

// Inicializar plugins nativos apenas quando rodando no app (Android/iOS)
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    // NÃO sobrepõe a status bar — reserva a área dela com fundo da app
    StatusBar.setOverlaysWebView({ overlay: false });
    // Ícones brancos na status bar (fundo escuro do RachApp)
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: "#020617" });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
