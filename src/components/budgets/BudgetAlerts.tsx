import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, TrendingUp } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useState } from "react";
import { BudgetWithSpending } from "@/hooks/useBudgets";

interface BudgetAlertsProps {
  overBudgetCategories: BudgetWithSpending[];
}

export function BudgetAlerts({ overBudgetCategories }: BudgetAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const visibleAlerts = overBudgetCategories.filter(
    (b) => !dismissedAlerts.has(b.id)
  );

  const dismissAlert = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getIcon = (iconName: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const Icon = icons[iconName] || LucideIcons.Tag;
    return <Icon className="w-4 h-4" />;
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <AnimatePresence>
        {visibleAlerts.map((budget, index) => {
          const exceededBy = budget.spent - budget.amount;
          const exceededPercentage = ((exceededBy / budget.amount) * 100).toFixed(0);

          return (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative overflow-hidden"
            >
              <div className="flex items-center gap-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex-shrink-0 p-2 rounded-lg bg-destructive/20">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="p-1 rounded"
                      style={{
                        backgroundColor: `${budget.category?.color || "#6B46FF"}20`,
                        color: budget.category?.color || "#6B46FF",
                      }}
                    >
                      {getIcon(budget.category?.icon || "Tag")}
                    </span>
                    <h4 className="text-foreground font-medium">
                      {budget.category?.name || "Categoria"}
                    </h4>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Orçamento excedido em{" "}
                    <span className="text-destructive font-semibold">
                      {formatCurrency(exceededBy)}
                    </span>{" "}
                    ({exceededPercentage}% acima do limite)
                  </p>
                </div>

                <div className="flex-shrink-0 text-right mr-8">
                  <p className="text-muted-foreground text-xs">Gasto / Limite</p>
                  <p className="text-foreground font-semibold">
                    <span className="text-destructive">{formatCurrency(budget.spent)}</span>
                    <span className="text-muted-foreground"> / </span>
                    {formatCurrency(budget.amount)}
                  </p>
                </div>

                <button
                  onClick={() => dismissAlert(budget.id)}
                  className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
