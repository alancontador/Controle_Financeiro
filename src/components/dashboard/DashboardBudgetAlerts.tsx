import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Wallet, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useBudgets, BudgetWithSpending } from "@/hooks/useBudgets";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function BudgetRow({ budget, index }: { budget: BudgetWithSpending; index: number }) {
  const pct = Math.min(budget.percentage, 100);
  const isWarning = budget.percentage >= 80 && budget.percentage < 100;
  const isOver = budget.isOverBudget;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="py-1.5"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {isOver && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
          <span className="text-sm text-foreground truncate">{budget.category?.name || "Categoria"}</span>
          {budget.person && <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{budget.person}</span>}
        </div>
        <span className={cn("text-xs font-semibold whitespace-nowrap", isOver ? "text-destructive" : isWarning ? "text-yellow-600" : "text-muted-foreground")}>
          {fmt(budget.spent)} / {fmt(budget.amount)}
        </span>
      </div>
      <Progress
        value={pct}
        className={cn("h-1.5", isOver ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-yellow-500" : "[&>div]:bg-primary")}
      />
    </motion.div>
  );
}

interface Props {
  /** Mes em analise (acompanha o seletor do dashboard). */
  month?: Date;
  /** Filtro de pessoa do dashboard. */
  person?: string | null;
}

/**
 * Card de orcamentos do dashboard: o teto mensal da casa (Configuracoes) e os
 * limites por categoria do mes selecionado, dos mais usados para os menos.
 * Antes so aparecia quem passava de 80%, e num mes sem lancamentos parecia
 * que nao existia orcamento nenhum.
 */
export function DashboardBudgetAlerts({ month = new Date(), person = null }: Props) {
  const { budgets, loading, globalBudget, monthTotal } = useBudgets(month, person);

  const sorted = [...budgets].sort((a, b) => b.percentage - a.percentage);
  const shown = sorted.slice(0, 5);
  const overCount = budgets.filter((b) => b.isOverBudget).length;
  const warningCount = budgets.filter((b) => b.percentage >= 80 && !b.isOverBudget).length;
  const globalPct = globalBudget > 0 ? (monthTotal / globalBudget) * 100 : 0;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3"><div className="h-5 bg-muted rounded w-32" /></CardHeader>
        <CardContent className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-10 bg-muted rounded" />)}</CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-primary" />
              Orçamentos
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              {overCount > 0 && <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">{overCount} estourado{overCount > 1 ? "s" : ""}</span>}
              {warningCount > 0 && <span className="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">{warningCount} atenção</span>}
              {overCount === 0 && warningCount === 0 && budgets.length > 0 && <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">dentro do limite</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {globalBudget > 0 && !person && (
            <div className="rounded-lg border border-border/60 p-3 mb-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium">Teto do mês (casa)</span>
                <span className={cn("text-xs font-semibold", globalPct > 100 ? "text-destructive" : "text-muted-foreground")}>
                  {fmt(monthTotal)} / {fmt(globalBudget)} · {Math.round(globalPct)}%
                </span>
              </div>
              <Progress value={Math.min(globalPct, 100)} className={cn("h-2", globalPct > 100 ? "[&>div]:bg-destructive" : globalPct > 80 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-primary")} />
            </div>
          )}

          {budgets.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              {person ? `Nenhum orçamento para ${person}.` : "Nenhum limite por categoria definido."}{" "}
              <Link to="/budgets" className="text-primary hover:underline inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Criar orçamento</Link>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {shown.map((b, i) => <BudgetRow key={b.id} budget={b} index={i} />)}
            </div>
          )}

          <Link to="/budgets" className="block">
            <Button variant="outline" size="sm" className="w-full mt-2 gap-2">
              {budgets.length > shown.length ? `Ver todos (${budgets.length})` : "Gerenciar Orçamentos"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
