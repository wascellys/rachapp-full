/**
 * Blocos de visualização reutilizáveis: KPI, gráficos de barras e pódio.
 * Cores das séries vêm dos tokens --chart-* (paleta validada para daltonismo).
 */
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatarNome, iniciais, nomeCurto } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ─── KPI ─── */
export function StatTile({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("stat-tile", className)}>
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span className="min-w-0 truncate text-xs font-extrabold uppercase tracking-wider" title={label}>{label}</span>
        {icon && <span className="shrink-0 text-base" aria-hidden>{icon}</span>}
      </div>
      <span className="truncate text-3xl font-black tabular-nums leading-tight text-foreground">{value}</span>
      {hint && <span className="truncate text-xs font-semibold text-muted-foreground" title={hint}>{hint}</span>}
    </div>
  );
}

/* ─── Gráfico de barras (1 a 2 séries, um único eixo) ─── */
export interface Serie {
  key: string;
  label: string;
  /** índice do token --chart-N */
  slot: 1 | 2 | 3 | 4 | 5;
}

function ChartTooltip({ active, payload, label, series }: TooltipProps<number, string> & { series: Serie[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border-2 border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-xs font-bold text-muted-foreground">{label}</p>
      {series.map(s => {
        const item = payload.find(p => p.dataKey === s.key);
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: `var(--chart-${s.slot})` }} />
            <span className="font-black tabular-nums text-foreground">{item?.value ?? 0}</span>
            <span className="text-xs font-semibold text-muted-foreground">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Legenda({ series }: { series: Serie[] }) {
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-4 text-xs font-bold text-muted-foreground" role="list">
      {series.map(s => (
        <span key={s.key} className="flex items-center gap-1.5" role="listitem">
          <span className="size-2.5 rounded-[3px]" style={{ background: `var(--chart-${s.slot})` }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function BarChartCard({
  data,
  xKey,
  series,
  height = 240,
  ariaLabel,
}: {
  data: Record<string, any>[];
  xKey: string;
  series: Serie[];
  height?: number;
  ariaLabel: string;
}) {
  return (
    <div className="space-y-3">
      <Legenda series={series} />
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 700 }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip series={series} />} />
            {series.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={`var(--chart-${s.slot})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Barras horizontais de líderes (1 série) ─── */
export function LeaderBars({
  itens,
  unidade,
  slot = 1,
}: {
  itens: { id: string; nome: string; valor: number; foto?: string | null }[];
  unidade: string;
  slot?: Serie["slot"];
}) {
  const max = Math.max(1, ...itens.map(i => i.valor));
  if (itens.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Ainda sem dados.</p>;
  }
  return (
    <ol className="space-y-2.5">
      {itens.map((item, idx) => (
        <li key={item.id} className="flex items-center gap-3" title={`${item.nome}: ${item.valor} ${unidade}`}>
          <span className="w-5 text-right text-xs font-black tabular-nums text-muted-foreground">{idx + 1}</span>
          <Avatar className="size-7 shrink-0 rounded-full">
            <AvatarImage src={item.foto || undefined} className="object-cover" />
            <AvatarFallback className="bg-muted text-[10px] font-black">{iniciais(item.nome)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-bold">
                <span className="sm:hidden">{nomeCurto(item.nome)}</span>
                <span className="hidden sm:inline">{formatarNome(item.nome)}</span>
              </span>
              <span className="shrink-0 text-sm font-black tabular-nums">{item.valor}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${(item.valor / max) * 100}%`, background: `var(--chart-${slot})` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ─── Pódio top 3 ─── */
export interface PodioItem {
  id: string;
  nome: string;
  foto?: string | null;
  valor: number;
  detalhe?: string;
}

const PODIO_ESTILO = [
  { medalha: "#f5c518", altura: "h-24", ordem: "order-2", label: "1º" },
  { medalha: "#c3cad4", altura: "h-16", ordem: "order-1", label: "2º" },
  { medalha: "#d08a4f", altura: "h-12", ordem: "order-3", label: "3º" },
];

export function Podio({
  itens,
  unidade,
  wrap,
}: {
  itens: PodioItem[];
  unidade: string;
  /** Permite envolver cada jogador (ex.: abrir a carta) */
  wrap?: (item: PodioItem, node: ReactNode) => ReactNode;
}) {
  if (itens.length === 0) return null;
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Pódio">
      {itens.slice(0, 3).map((item, idx) => {
        const e = PODIO_ESTILO[idx];
        const conteudo = (
          <div className="flex w-full min-w-0 flex-col items-center gap-1.5 text-center">
            <div className="relative">
              <Avatar
                className={cn("rounded-full border-4 bg-card", idx === 0 ? "size-20 sm:size-24" : "size-16 sm:size-20")}
                style={{ borderColor: e.medalha }}
              >
                <AvatarImage src={item.foto || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted text-lg font-black">{iniciais(item.nome)}</AvatarFallback>
              </Avatar>
              <span
                className="absolute -bottom-1 left-1/2 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-card text-xs font-black text-black"
                style={{ background: e.medalha }}
              >
                {e.label}
              </span>
            </div>
            <span className="mt-1 block w-full truncate text-sm font-extrabold" title={formatarNome(item.nome)}>
              {/* Colunas do pódio são estreitas: só o primeiro nome no celular */}
              <span className="sm:hidden">{formatarNome(item.nome).split(" ")[0]}</span>
              <span className="hidden sm:inline">{nomeCurto(item.nome)}</span>
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              <span className="text-base font-black tabular-nums text-foreground">{item.valor}</span> {unidade}
            </span>
            {item.detalhe && <span className="block w-full truncate text-[11px] font-semibold text-muted-foreground">{item.detalhe}</span>}
          </div>
        );
        return (
          <div key={item.id} className={cn("flex min-w-0 flex-col items-center", e.ordem)}>
            {wrap ? wrap(item, conteudo) : conteudo}
            <div
              className={cn("podium-step mt-2 w-full", e.altura)}
              style={{ background: `linear-gradient(180deg, color-mix(in oklch, ${e.medalha} 35%, transparent), transparent)` }}
            />
          </div>
        );
      })}
    </div>
  );
}
