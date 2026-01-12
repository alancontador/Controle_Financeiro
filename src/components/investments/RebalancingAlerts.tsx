import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AllocationData {
  id: string;
  name: string;
  value: number;
  color: string;
  target: number;
  percentage: number;
}

interface RebalancingAlertsProps {
  allocationByClass: AllocationData[];
  totalValue: number;
  threshold?: number; // default 1%
}

interface RebalancingAction {
  classId: string;
  className: string;
  color: string;
  currentPercentage: number;
  targetPercentage: number;
  deviation: number;
  action: "buy" | "sell";
  amountBRL: number;
}

export function RebalancingAlerts({ allocationByClass, totalValue, threshold = 1 }: RebalancingAlertsProps) {
  const rebalancingActions = useMemo((): RebalancingAction[] => {
    if (totalValue <= 0 || allocationByClass.length === 0) return [];

    return allocationByClass
      .map((allocation) => {
        const deviation = allocation.percentage - allocation.target;
        const absDeviation = Math.abs(deviation);

        if (absDeviation <= threshold) return null;

        // Calculate how much to buy/sell to reach target
        const targetValue = (allocation.target / 100) * totalValue;
        const currentValue = allocation.value;
        const amountBRL = Math.abs(targetValue - currentValue);

        return {
          classId: allocation.id,
          className: allocation.name,
          color: allocation.color,
          currentPercentage: allocation.percentage,
          targetPercentage: allocation.target,
          deviation,
          action: deviation > 0 ? "sell" : "buy",
          amountBRL,
        } as RebalancingAction;
      })
      .filter((action): action is RebalancingAction => action !== null)
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  }, [allocationByClass, totalValue, threshold]);

  const isBalanced = rebalancingActions.length === 0;
  const totalAdjustment = rebalancingActions.reduce((acc, action) => acc + action.amountBRL, 0) / 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isBalanced ? 'bg-accent/10' : 'bg-warning/10'
          }`}>
            {isBalanced ? (
              <CheckCircle className="w-5 h-5 text-accent" />
            ) : (
              <Scale className="w-5 h-5 text-warning" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Rebalanceamento</h2>
            <p className="text-xs text-muted-foreground">
              Desvio tolerado: ±{threshold}%
            </p>
          </div>
        </div>
        {!isBalanced && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            {rebalancingActions.length} ajuste{rebalancingActions.length > 1 ? 's' : ''} sugerido{rebalancingActions.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {isBalanced ? (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-accent/50" />
          <p className="text-foreground font-medium mb-1">Portfólio Balanceado! 🎯</p>
          <p className="text-muted-foreground text-sm">
            Todas as classes estão dentro da meta de alocação.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-secondary/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total a rebalancear</p>
                <p className="text-lg font-bold text-foreground">
                  R$ {totalAdjustment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Classes desbalanceadas</p>
                <p className="text-lg font-bold text-foreground">{rebalancingActions.length}</p>
              </div>
            </div>
          </div>

          {/* Actions List */}
          <div className="space-y-3">
            {rebalancingActions.map((action, index) => (
              <motion.div
                key={action.classId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: action.color }}
                  />
                  <div>
                    <p className="text-foreground font-medium text-sm">{action.className}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{action.currentPercentage.toFixed(1)}%</span>
                      <span>→</span>
                      <span className="text-primary">{action.targetPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${action.action === "buy" ? 'text-accent' : 'text-destructive'}`}>
                      {action.action === "buy" ? '+' : '-'}R$ {action.amountBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs ${action.deviation > 0 ? 'text-destructive' : 'text-accent'}`}>
                      {action.deviation > 0 ? '+' : ''}{action.deviation.toFixed(1)}% do alvo
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${action.action === "buy" ? 'bg-accent/10' : 'bg-destructive/10'}`}>
                    {action.action === "buy" ? (
                      <TrendingUp className={`w-4 h-4 text-accent`} />
                    ) : (
                      <TrendingDown className={`w-4 h-4 text-destructive`} />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tip */}
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Dica:</strong> Considere rebalancear comprando ativos das classes abaixo da meta em vez de vender. 
              Isso evita custos de transação e impostos sobre ganhos de capital.
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
