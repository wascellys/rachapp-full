import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatarNome } from "@/lib/format";
import { social, type UsuarioComAmizade } from "@/lib/social";
import { AvatarUsuario } from "./Basicos";

interface Props {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  rows?: number;
  autoFocus?: boolean;
  /** Ctrl/Cmd + Enter envia */
  onEnviar?: () => void;
  "aria-label"?: string;
}

/** @ antes do cursor: "Valeu @jo" -> "jo" */
const GATILHO = /(^|\s)@([\w.+-]*)$/;

/**
 * Textarea com marcação de pessoas: ao digitar "@", sugere usuários de todos os rachas.
 * Setas escolhem, Enter/Tab inserem "@usuario ", Esc fecha.
 */
export function MentionTextarea({ value, onChange, placeholder, className, maxLength, rows = 3, autoFocus, onEnviar, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [consulta, setConsulta] = useState<string | null>(null);
  const [sugestoes, setSugestoes] = useState<UsuarioComAmizade[]>([]);
  const [ativo, setAtivo] = useState(0);

  // Busca com atraso curto para não disparar uma requisição por tecla
  useEffect(() => {
    if (consulta === null) {
      setSugestoes([]);
      return;
    }
    let cancelado = false;
    const t = setTimeout(() => {
      social
        .buscar(consulta)
        .then(lista => {
          if (!cancelado) {
            setSugestoes(lista.slice(0, 6));
            setAtivo(0);
          }
        })
        .catch(() => !cancelado && setSugestoes([]));
    }, 200);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [consulta]);

  const atualizarConsulta = (texto: string, cursor: number) => {
    const m = GATILHO.exec(texto.slice(0, cursor));
    setConsulta(m ? m[2] : null);
  };

  const escolher = (u: UsuarioComAmizade) => {
    const el = ref.current;
    const cursor = el?.selectionStart ?? value.length;
    const antes = value.slice(0, cursor).replace(GATILHO, (_t, espaco: string) => `${espaco}@${u.username} `);
    const novo = antes + value.slice(cursor);
    onChange(novo);
    setConsulta(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(antes.length, antes.length);
    });
  };

  const aberto = consulta !== null && sugestoes.length > 0;

  return (
    <div className="relative">
      <Textarea
        {...rest}
        ref={ref}
        value={value}
        rows={rows}
        maxLength={maxLength}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={cn("resize-none", className)}
        role="combobox"
        aria-expanded={aberto}
        aria-autocomplete="list"
        onChange={e => {
          onChange(e.target.value);
          atualizarConsulta(e.target.value, e.target.selectionStart);
        }}
        onClick={e => atualizarConsulta(value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setConsulta(null), 150)}
        onKeyDown={e => {
          if (aberto) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAtivo(i => (i + (e.key === "ArrowDown" ? 1 : sugestoes.length - 1)) % sugestoes.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              escolher(sugestoes[ativo]);
              return;
            }
            if (e.key === "Escape") {
              setConsulta(null);
              return;
            }
          }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && onEnviar) {
            e.preventDefault();
            onEnviar();
          }
        }}
      />
      {aberto && (
        <ul
          role="listbox"
          aria-label="Marcar pessoa"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-2xl border-2 border-border bg-popover p-1 shadow-lg"
        >
          {sugestoes.map((u, i) => (
            <li key={u.id} role="option" aria-selected={i === ativo}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => escolher(u)}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 text-left",
                  i === ativo ? "bg-primary/15" : "hover:bg-muted",
                )}
              >
                <AvatarUsuario usuario={u} link={false} className="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{formatarNome(u.nome)}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{u.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
