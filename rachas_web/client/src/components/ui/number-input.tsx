import * as React from "react";
import { Input } from "@/components/ui/input";

type NumberInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "min" | "max"> & {
  value: number;
  onChange: (valor: number) => void;
  min?: number;
  max?: number;
};

/**
 * Campo numérico que permite apagar e digitar livremente.
 * Enquanto a pessoa digita, só repassa valores válidos; o mínimo/máximo é aplicado ao sair do campo,
 * evitando o "1" que voltava sozinho ao apagar o número.
 */
export function NumberInput({ value, onChange, min, max, onBlur, ...props }: NumberInputProps) {
  const [texto, setTexto] = React.useState(String(value));

  // Acompanha mudanças externas (ex.: botão "Usar sugestão") sem atrapalhar a digitação
  React.useEffect(() => {
    setTexto(atual => (atual !== "" && Number(atual) === value ? atual : String(value)));
  }, [value]);

  const limitar = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  return (
    <Input
      {...props}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={texto}
      onChange={e => {
        const bruto = e.target.value;
        setTexto(bruto);
        if (bruto === "") return;
        const n = Math.trunc(Number(bruto));
        if (Number.isFinite(n) && n === limitar(n)) onChange(n);
      }}
      onBlur={e => {
        const n = Math.trunc(Number(texto));
        const final = texto === "" || !Number.isFinite(n) ? limitar(min ?? 0) : limitar(n);
        setTexto(String(final));
        if (final !== value) onChange(final);
        onBlur?.(e);
      }}
    />
  );
}
