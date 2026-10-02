import { useEffect, useState } from "react";
import { TIER_THEME } from "@/lib/playerRating";
import { RARIDADE_TIER, numeroFigurinha, type Raridade } from "@/lib/album";
import { iniciais, posicaoSigla } from "@/lib/format";
import "./styles/Figurinha.css";

interface FigurinhaProps {
  raridade: Raridade;
  numero: number;
  nome: string;
  posicao?: string;
  foto?: string | null;
  /** "colada" mostra a figurinha; "pendente" brilha esperando ser colada; "vazia" é o espaço no álbum. */
  estado?: "colada" | "pendente" | "vazia";
  repetidas?: number;
  nova?: boolean;
  className?: string;
}

export function Figurinha({ raridade, numero, nome, posicao, foto, estado = "colada", repetidas = 0, nova, className = "" }: FigurinhaProps) {
  const theme = TIER_THEME[RARIDADE_TIER[raridade]];
  const [fotoFalhou, setFotoFalhou] = useState(false);
  useEffect(() => setFotoFalhou(false), [foto]);

  if (estado === "vazia") {
    return (
      <div className={`fig fig-vazia ${className}`} aria-label={`Figurinha ${numeroFigurinha(numero)} ${theme.label}: ainda não obtida`}>
        <span className="fig-vazia-num">{numeroFigurinha(numero)}</span>
        <svg viewBox="0 0 64 64" className="fig-vazia-silhueta" aria-hidden>
          <circle cx="32" cy="22" r="12" />
          <path d="M8 62c2-14 12-22 24-22s22 8 24 22z" />
        </svg>
        <span className="fig-vazia-raridade">{theme.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`fig ${estado === "pendente" ? "fig-pendente" : ""} ${className}`}
      style={{ background: theme.frame, boxShadow: theme.glow }}
      aria-label={`Figurinha ${numeroFigurinha(numero)} de ${nome}, ${theme.label}${estado === "pendente" ? ", pronta para colar" : ""}`}
    >
      <div className="fig-inner" style={{ background: theme.bg, color: theme.ink }}>
        <div className="fig-top">
          <span className="fig-num">{numeroFigurinha(numero)}</span>
          {posicao && <span className="fig-pos" style={{ color: theme.accent }}>{posicaoSigla(posicao)}</span>}
        </div>
        <div className="fig-photo">
          {foto && !fotoFalhou ? (
            <img src={foto} alt="" draggable={false} loading="lazy" onError={() => setFotoFalhou(true)} />
          ) : (
            <span className="fig-initials" style={{ color: theme.ink }}>{iniciais(nome)}</span>
          )}
        </div>
        <div className="fig-bottom">
          <span className="fig-name" title={nome}>{nome}</span>
          <span className="fig-tier" style={{ color: theme.inkSoft }}>{theme.label}</span>
        </div>
        {theme.foil && <div className="fig-foil" aria-hidden />}
      </div>
      {nova && <span className="fig-badge fig-badge-nova">Nova!</span>}
      {!nova && repetidas > 0 && <span className="fig-badge" title={`${repetidas} repetida(s)`}>+{repetidas}</span>}
      {estado === "pendente" && <span className="fig-colar">Colar</span>}
    </div>
  );
}
