import { motion } from "framer-motion";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BudgetWithSpending } from "@/hooks/useBudgets";

interface BudgetCardProps {
  budget: BudgetWithSpending;
  onEdit: (budget: BudgetWithSpending) => void;
  onDelete: (budget: BudgetWithSpending) => void;
  index: number;
}

export function BudgetCard({ budget, onEdit, onDelete, index }: BudgetCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getIcon = (iconName: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const Icon = icons[iconName] || LucideIcons.Tag;
    return <Icon className="w-5 h-5" />;
  };

  const getProgressColor = () => {
    if (budget.percentage >= 100) return "bg-destructive";
    if (budget.percentage >= 80) return "bg-warning";
    return "bg-accent";
  };

  const getStatusColor = () => {
    if (budget.percentage >= 100) return "text-destructive";
    if (budget.percentage >= 80) return "text-warning";
    return "text-accent";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`glass-card overflow-hidden ${budget.isOverBudget ? "border-destructive/50" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `${budget.category?.color || "#6B46FF"}20`,
                  color: budget.category?.color || "#6B46FF",
                }}
              >
                {getIcon(budget.category?.icon || "Tag")}
              </div>
              <div>
                <h3 className="text-foreground font-semibold">
                  {budget.category?.name || "Categoria"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  Limite mensal
                </p>
              </div>
            </div>

            {budget.isOverBudget && (
              <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-destructive font-medium">Excedido</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Gasto</span>
              <span className={getStatusColor()}>
                {budget.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`absolute left-0 top-0 h-full rounded-full ${getProgressColor()}`}
              />
              {budget.percentage > 100 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  className="absolute left-0 top-0 h-full bg-destructive/30 rounded-full"
                />
              )}
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-muted-foreground text-xs">Limite</p>
              <p className="text-foreground font-semibold">{formatCurrency(budget.amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Gasto</p>
              <p className={`font-semibold ${budget.isOverBudget ? "text-destructive" : "text-foreground"}`}>
                {formatCurrency(budget.spent)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Disponível</p>
              <p className={`font-semibold ${budget.remaining >= 0 ? "text-accent" : "text-destructive"}`}>
                {formatCurrency(Math.max(0, budget.remaining))}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(budget)}
              className="flex-1"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(budget)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
