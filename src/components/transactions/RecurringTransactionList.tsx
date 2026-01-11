import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Pencil, Trash2, Pause, Play, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RecurringTransaction } from "@/hooks/useRecurringTransactions";

interface RecurringTransactionListProps {
  transactions: RecurringTransaction[];
  loading: boolean;
  onEdit: (transaction: RecurringTransaction) => void;
  onDelete: (transaction: RecurringTransaction) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const frequencyLabels: Record<string, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export function RecurringTransactionList({
  transactions,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: RecurringTransactionListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">
          Nenhuma transação recorrente
        </h3>
        <p className="text-sm text-muted-foreground">
          Crie transações recorrentes para automatizar receitas e despesas
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className={`glass-card p-4 ${!transaction.is_active ? "opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    transaction.type === "income"
                      ? "bg-success/10"
                      : "bg-destructive/10"
                  }`}
                >
                  <RefreshCw
                    className={`w-5 h-5 ${
                      transaction.type === "income"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {transaction.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-1.5 py-0.5 bg-muted rounded">
                      {frequencyLabels[transaction.frequency]}
                    </span>
                    {transaction.category && (
                      <span className="truncate">{transaction.category.name}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <p
                    className={`font-semibold ${
                      transaction.type === "income"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}R${" "}
                    {Number(transaction.amount).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Próx: {new Date(transaction.next_execution_date).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>

                <Switch
                  checked={transaction.is_active}
                  onCheckedChange={(checked) =>
                    onToggleActive(transaction.id, checked)
                  }
                />

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(transaction)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile price */}
            <div className="sm:hidden mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Próx: {new Date(transaction.next_execution_date).toLocaleDateString("pt-BR")}</span>
              </div>
              <p
                className={`font-semibold ${
                  transaction.type === "income"
                    ? "text-success"
                    : "text-destructive"
                }`}
              >
                {transaction.type === "income" ? "+" : "-"}R${" "}
                {Number(transaction.amount).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
