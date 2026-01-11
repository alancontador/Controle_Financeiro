import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/hooks/useTransactions";
import { RecurringTransaction } from "@/hooks/useRecurringTransactions";

const formSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(100),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  type: z.enum(["income", "expense"]),
  category_id: z.string().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  day_of_month: z.coerce.number().min(1).max(31).nullable(),
  next_execution_date: z.string().min(1, "Data de início é obrigatória"),
  notes: z.string().max(500).nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData & { is_active: boolean; day_of_week: number | null }) => Promise<void>;
  categories: Category[];
  transaction?: RecurringTransaction | null;
  isLoading?: boolean;
}

export function RecurringTransactionModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  transaction,
  isLoading,
}: RecurringTransactionModalProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      type: "expense",
      category_id: null,
      frequency: "monthly",
      day_of_month: new Date().getDate(),
      next_execution_date: new Date().toISOString().split("T")[0],
      notes: null,
    },
  });

  const watchType = form.watch("type");
  const watchFrequency = form.watch("frequency");

  useEffect(() => {
    if (transaction) {
      form.reset({
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.category_id,
        frequency: transaction.frequency,
        day_of_month: transaction.day_of_month,
        next_execution_date: transaction.next_execution_date,
        notes: transaction.notes,
      });
    } else {
      form.reset({
        description: "",
        amount: 0,
        type: "expense",
        category_id: null,
        frequency: "monthly",
        day_of_month: new Date().getDate(),
        next_execution_date: new Date().toISOString().split("T")[0],
        notes: null,
      });
    }
  }, [transaction, form, isOpen]);

  const filteredCategories = categories.filter((c) => c.type === watchType);

  const handleSubmit = async (data: FormData) => {
    await onSubmit({
      ...data,
      is_active: true,
      day_of_week: null,
    });
    onClose();
  };

  const frequencyLabels = {
    daily: "Diária",
    weekly: "Semanal",
    monthly: "Mensal",
    yearly: "Anual",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            {transaction ? "Editar" : "Nova"} Transação Recorrente
          </DialogTitle>
          <DialogDescription>
            Configure uma transação que será criada automaticamente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Salário, Aluguel..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequência</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchFrequency === "monthly" && (
              <FormField
                control={form.control}
                name="day_of_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia do mês</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1-31"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="next_execution_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próxima execução</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="glow-primary">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
