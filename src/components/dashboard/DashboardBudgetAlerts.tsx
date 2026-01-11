import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertTriangle, TrendingUp, ArrowRight, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useBudgets, BudgetWithSpending } from "@/hooks/useBudgets";
import { cn } from "@/lib/utils";

function BudgetAlertItem({ budget, index }: { budget: BudgetWithSpending; index: number }) {
  const percentage = Math.min(budget.percentage, 100);
  const isWarning = budget.percentage >= 80 && budget.percentage < 100;
  const isOver = budget.isOverBudget;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isOver
          ? "bg-destructive/10 border-destructive/30"
          : isWarning
          ? "bg-yellow-500/10 border-yellow-500/30"
          : "bg-card border-border"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isOver ? (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          ) : (
            <TrendingUp className="w-4 h-4 text-yellow-500" />
          )}
          <span className="font-medium text-sm text-foreground">
            {budget.category?.name || "Categoria"}
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            isOver
              ? "bg-destructive/20 text-destructive"
              : "bg-yellow-500/20 text-yellow-600"
          )}
        >
          {budget.percentage.toFixed(0)}%
        </span>
      </div>

      <Progress
        value={percentage}
        className={cn(
          "h-1.5",
          isOver ? "[&>div]:bg-destructive" : "[&>div]:bg-yellow-500"
        )}
      />

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>
          R$ {budget.spent.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
        </span>
        <span>
          / R$ {budget.amount.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
        </span>
      </div>
    </motion.div>
  );
}

export function DashboardBudgetAlerts() {
  const { budgets, loading } = useBudgets();

  // Filter budgets that are at 80% or above
  const alertBudgets = budgets
    .filter((b) => b.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (alertBudgets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground">Tudo sob controle!</h4>
                <p className="text-sm text-muted-foreground">
                  Seus gastos estão dentro dos limites definidos.
                </p>
              </div>
              <Link to="/budgets">
                <Button variant="ghost" size="sm" className="shrink-0 gap-1">
                  Ver <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const overCount = alertBudgets.filter((b) => b.isOverBudget).length;
  const warningCount = alertBudgets.length - overCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Alertas de Orçamento
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              {overCount > 0 && (
                <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                  {overCount} estourado{overCount > 1 ? "s" : ""}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">
                  {warningCount} atenção
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertBudgets.map((budget, index) => (
            <BudgetAlertItem key={budget.id} budget={budget} index={index} />
          ))}

          <Link to="/budgets" className="block">
            <Button variant="outline" size="sm" className="w-full mt-2 gap-2">
              Gerenciar Orçamentos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
