import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Category, Transaction } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

const transactionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Descrição é obrigatória")
    .max(100, "Descrição deve ter no máximo 100 caracteres"),
  amount: z
    .string()
    .min(1, "Valor é obrigatório")
    .refine(
      (val) => {
        const num = parseFloat(val.replace(",", "."));
        return !isNaN(num) && num > 0;
      },
      { message: "Valor deve ser um número positivo" }
    )
    .refine(
      (val) => {
        const num = parseFloat(val.replace(",", "."));
        return num <= 999999999.99;
      },
      { message: "Valor máximo excedido" }
    ),
  type: z.enum(["income", "expense"]),
  category_id: z.string().optional(),
  date: z.date({ required_error: "Data é obrigatória" }),
  notes: z
    .string()
    .max(500, "Observações devem ter no máximo 500 caracteres")
    .optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    amount: number;
    type: "income" | "expense";
    category_id: string | null;
    date: string;
    notes: string | null;
  }) => Promise<void>;
  categories: Category[];
  transaction?: Transaction | null;
  isLoading?: boolean;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  transaction,
  isLoading,
}: TransactionModalProps) {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: "",
      type: "expense",
      category_id: undefined,
      date: new Date(),
      notes: "",
    },
  });

  const watchType = form.watch("type");

  // Reset category when type changes (only if not editing)
  useEffect(() => {
    if (!transaction) {
      form.setValue("category_id", undefined);
    }
  }, [watchType, form, transaction]);

  useEffect(() => {
    if (transaction) {
      form.reset({
        description: transaction.description,
        amount: String(Math.abs(Number(transaction.amount))),
        type: transaction.type,
        category_id: transaction.category_id || undefined,
        date: new Date(transaction.date + "T00:00:00"),
        notes: transaction.notes || "",
      });
    } else {
      form.reset({
        description: "",
        amount: "",
        type: "expense",
        category_id: undefined,
        date: new Date(),
        notes: "",
      });
    }
  }, [transaction, form, isOpen]);

  const handleSubmit = async (data: TransactionFormData) => {
    await onSubmit({
      description: data.description,
      amount: parseFloat(data.amount.replace(",", ".")),
      type: data.type,
      category_id: data.category_id || null,
      date: format(data.date, "yyyy-MM-dd"),
      notes: data.notes || null,
    });
    onClose();
  };

  const filteredCategories = categories.filter((cat) => cat.type === watchType);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal Container - Full screen on mobile for better UX */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          >
            <div 
              className="glass-card p-4 sm:p-6 w-full max-w-md my-auto max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {transaction ? "Editar Transação" : "Nova Transação"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Form */}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  {/* Type Toggle */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={field.value === "income" ? "default" : "outline"}
                            className={cn(
                              "flex-1",
                              field.value === "income" &&
                                "bg-success hover:bg-success/90 text-success-foreground"
                            )}
                            onClick={() => field.onChange("income")}
                          >
                            Receita
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "expense" ? "default" : "outline"}
                            className={cn(
                              "flex-1",
                              field.value === "expense" &&
                                "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            )}
                            onClick={() => field.onChange("expense")}
                          >
                            Despesa
                          </Button>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Salário, Supermercado..."
                            className="bg-secondary/50 border-border/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Amount */}
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0,00"
                            className="bg-secondary/50 border-border/50"
                            inputMode="decimal"
                            {...field}
                            onChange={(e) => {
                              // Allow only numbers, comma and dot
                              const value = e.target.value.replace(/[^0-9.,]/g, "");
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-secondary/50 border-border/50">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-border">
                            {filteredCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: cat.color }}
                                  />
                                  {cat.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-secondary/50 border-border/50",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? format(field.value, "dd 'de' MMMM 'de' yyyy", {
                                      locale: ptBR,
                                    })
                                  : "Selecione uma data"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-card border-border">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              locale={ptBR}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Adicione detalhes..."
                            className="bg-secondary/50 border-border/50 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={onClose}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 glow-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? "Salvando..." : transaction ? "Salvar" : "Adicionar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
