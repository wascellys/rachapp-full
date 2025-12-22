import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FaTrophy } from "react-icons/fa";

const premioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  valor_pontos: z.number().min(1, "O valor deve ser de pelo menos 1 ponto"),
});

type PremioFormValues = z.infer<typeof premioSchema>;

interface PremioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PremioFormValues) => Promise<void>;
  initialData?: {
    nome: string;
    valor_pontos: number;
  } | null;
}

export function PremioModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: PremioModalProps) {
  const form = useForm<PremioFormValues>({
    resolver: zodResolver(premioSchema),
    defaultValues: {
      nome: "",
      valor_pontos: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nome: initialData?.nome || "",
        valor_pontos: initialData?.valor_pontos || 0,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = async (data: PremioFormValues) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaTrophy className="text-yellow-500" />
            {initialData ? "Editar Prêmio" : "Novo Prêmio"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Prêmio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Artilheiro do Mês" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor_pontos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (Pontos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 50"
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Salvando..."
                  : initialData
                  ? "Salvar Alterações"
                  : "Criar Prêmio"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
