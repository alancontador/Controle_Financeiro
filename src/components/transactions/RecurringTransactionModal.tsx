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
import { HierarchicalCategorySelector } from "./HierarchicalCategorySelector";
import { firstMonthlyOccurrence } from "@/lib/recurring";
import { toIsoDate } from "@/lib/dates";

const formSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(100),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  type: z.enum(["income", "expense"]),
  category_id: z.string().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  day_of_month: z.coerce.number().min(1).max(31).nullable(),
  next_execution_date: z.string().min(1, "Data de início é obrigatória"),
  notes: z.string().max(500).nullable(),
  /** Duracao: sem fim, ate uma data, ou N parcelas. */
  duration: z.enum(["forever", "until", "count"]),
  end_date: z.string().nullable(),
  installments_total: z.coerce.number().int().min(1).max(600).nullable(),
}).superRefine((d, ctx) => {
  if (d.duration === "until" && !d.end_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "Informe a data final" });
  if (d.duration === "until" && d.end_date && d.end_date < d.next_execution_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "A data final tem que ser depois da primeira ocorrência" });
  if (d.duration === "count" && !d.installments_total) ctx.addIssue({ code: "custom", path: ["installments_total"], message: "Informe o número de parcelas" });
});

type FormData = z.infer<typeof formSchema>;

/** O que vai para o banco: sem o campo auxiliar `duration`. */
export interface SubmitData {
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  day_of_month: number | null;
  day_of_week: number | null;
  next_execution_date: string;
  notes: string | null;
  end_date: string | null;
  installments_total: number | null;
  is_active: boolean;
}

const today = () => toIsoDate(new Date());
const emptyForm = (): FormData => ({
  description: "",
  amount: 0,
  type: "expense",
  category_id: null,
  frequency: "monthly",
  day_of_month: new Date().getDate(),
  next_execution_date: today(),
  notes: null,
  duration: "forever",
  end_date: null,
  installments_total: null,
});

interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubmitData) => Promise<void>;
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
    defaultValues: emptyForm(),
  });

  const watchType = form.watch("type");
  const watchFrequency = form.watch("frequency");
  const watchDuration = form.watch("duration");
  const watchDay = form.watch("day_of_month");
  const watchInstallments = form.watch("installments_total");

  // Dia do mes escolhido -> primeira ocorrencia e a proxima data em que esse dia cai
  // (neste mes se ainda nao passou). So ao criar; ao editar a data ja e a real.
  useEffect(() => {
    if (transaction || watchFrequency !== "monthly" || !watchDay) return;
    const day = Number(watchDay);
    if (day >= 1 && day <= 31) form.setValue("next_execution_date", firstMonthlyOccurrence(day, today()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchDay, watchFrequency, transaction]);

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
        duration: transaction.installments_total ? "count" : transaction.end_date ? "until" : "forever",
        end_date: transaction.end_date,
        installments_total: transaction.installments_total,
      });
    } else {
      form.reset(emptyForm());
    }
  }, [transaction, form, isOpen]);

  // Convert categories to the format expected by HierarchicalCategorySelector
  const categoriesWithParent = categories.map((cat) => ({
    ...cat,
    parent_category_id: (cat as any).parent_category_id || null,
  }));

  const handleSubmit = async (data: FormData) => {
    await onSubmit({
      description: data.description,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id,
      frequency: data.frequency,
      day_of_month: data.frequency === "monthly" ? data.day_of_month : null,
      next_execution_date: data.next_execution_date,
      notes: data.notes,
      end_date: data.duration === "until" ? data.end_date : null,
      installments_total: data.duration === "count" ? data.installments_total : null,
      is_active: true,
      day_of_week: null,
    });
    onClose();
  };

  const remaining = transaction && transaction.installments_total
    ? Math.max(0, (Number(watchInstallments) || transaction.installments_total) - transaction.installments_done)
    : null;

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
                  <FormControl>
                    <HierarchicalCategorySelector
                      categories={categoriesWithParent}
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value || null)}
                      type={watchType}
                      placeholder="Selecione uma categoria"
                    />
                  </FormControl>
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
                  <FormLabel>{transaction ? "Próxima ocorrência" : "Primeira ocorrência"}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="forever">Sem prazo (até eu pausar)</SelectItem>
                      <SelectItem value="until">Até uma data final</SelectItem>
                      <SelectItem value="count">Número de parcelas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchDuration === "until" && (
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Última ocorrência em</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchDuration === "count" && (
              <FormField
                control={form.control}
                name="installments_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de parcelas</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="600" placeholder="Ex: 12" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {transaction && transaction.installments_done > 0
                        ? `${transaction.installments_done} já geradas · ${remaining ?? 0} restantes. As transações saem como "${form.getValues("description") || "Descrição"} (n/${watchInstallments || "N"})".`
                        : `As transações saem como "${form.getValues("description") || "Descrição"} (1/${watchInstallments || "N"})", "(2/${watchInstallments || "N"})"... e a recorrência encerra sozinha na última.`}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
