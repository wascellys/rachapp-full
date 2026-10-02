import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  destructive?: boolean;
}

/**
 * Substitui o window.confirm() nativo por um diálogo do design system.
 *
 *   const [confirm, dialog] = useConfirm();
 *   if (await confirm({ title: "Excluir?" })) { ... }
 *   return <>{dialog}...</>;
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  const fechar = (resultado: boolean) => {
    resolver.current(resultado);
    setOptions(null);
  };

  const dialog = (
    <AlertDialog open={!!options} onOpenChange={open => !open && fechar(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => fechar(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => fechar(true)}
            className={cn(options?.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {options?.confirmText ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog] as const;
}
