import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
  getDaysInMonth,
  differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Target,
} from "lucide-react";
import { Transaction } from "@/hooks/useTransactions";
import { RecurringTransaction } from "@/hooks/useRecurringTransactions";

interface SpendingForecastProps {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  monthlyBudget?: number;
}

interface ForecastMonth {
  month: string;
  fullMonth: string;
  predicted: number;
  recurring: number;
  total: number;
  isProjection: boolean;
  confidence: number;
}

export function SpendingForecast({
  transactions,
  recurringTransactions,
  monthlyBudget = 0,
}: SpendingForecastProps) {
  // Calculate historical monthly averages
  const historicalData = useMemo(() => {
    const today = new Date();
    const sixMonthsAgo = subMonths(today, 6);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: today });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.date);
        return (
          t.type === "expense" &&
          transactionDate >= monthStart &&
          transactionDate <= monthEnd
        );
      });

      const total = monthTransactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );

      // Group by category
      const byCategory: Record<string, number> = {};
      monthTransactions.forEach((t) => {
        const categoryName = t.category?.name || "Outros";
        byCategory[categoryName] = (byCategory[categoryName] || 0) + Number(t.amount);
      });

      return {
        month,
        total,
        byCategory,
        transactionCount: monthTransactions.length,
      };
    });
  }, [transactions]);

  // Calculate category averages and trends
  const categoryAnalysis = useMemo(() => {
    const categories: Record<
      string,
      { total: number; count: number; trend: number[] }
    > = {};

    historicalData.forEach((month) => {
      Object.entries(month.byCategory).forEach(([category, amount]) => {
        if (!categories[category]) {
          categories[category] = { total: 0, count: 0, trend: [] };
        }
        categories[category].total += amount;
        categories[category].count++;
        categories[category].trend.push(amount);
      });
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      average: data.total / Math.max(data.count, 1),
      trend: data.trend,
      isGrowing:
        data.trend.length >= 2 &&
        data.trend[data.trend.length - 1] > data.trend[data.trend.length - 2],
    }));
  }, [historicalData]);

  // Calculate recurring monthly total
  const recurringMonthlyTotal = useMemo(() => {
    return recurringTransactions
      .filter((r) => r.is_active && r.type === "expense")
      .reduce((sum, r) => {
        const amount = Number(r.amount);
        switch (r.frequency) {
          case "daily":
            return sum + amount * 30;
          case "weekly":
            return sum + amount * 4;
          case "monthly":
            return sum + amount;
          case "yearly":
            return sum + amount / 12;
          default:
            return sum;
        }
      }, 0);
  }, [recurringTransactions]);

  // Generate forecast for next 3 months
  const forecast = useMemo((): ForecastMonth[] => {
    const today = new Date();
    const result: ForecastMonth[] = [];

    // Add last 3 historical months
    historicalData.slice(-3).forEach((data) => {
      result.push({
        month: format(data.month, "MMM", { locale: ptBR }),
        fullMonth: format(data.month, "MMMM yyyy", { locale: ptBR }),
        predicted: data.total,
        recurring: 0,
        total: data.total,
        isProjection: false,
        confidence: 100,
      });
    });

    // Calculate average monthly spending (excluding recurring)
    const avgMonthlySpending =
      historicalData.reduce((sum, m) => sum + m.total, 0) /
      Math.max(historicalData.length, 1);

    // Variable spending (total - recurring)
    const variableSpending = Math.max(0, avgMonthlySpending - recurringMonthlyTotal);

    // Project next 3 months
    for (let i = 1; i <= 3; i++) {
      const futureMonth = addMonths(today, i);
      const daysInMonth = getDaysInMonth(futureMonth);
      const avgDaysInMonth = 30;

      // Adjust for month length
      const adjustedVariable = (variableSpending * daysInMonth) / avgDaysInMonth;

      // Apply slight growth trend (2% per month based on typical inflation)
      const trendMultiplier = 1 + 0.02 * i;

      const predictedVariable = adjustedVariable * trendMultiplier;
      const total = predictedVariable + recurringMonthlyTotal;

      // Confidence decreases the further we project
      const confidence = Math.max(60, 95 - i * 10);

      result.push({
        month: format(futureMonth, "MMM", { locale: ptBR }),
        fullMonth: format(futureMonth, "MMMM yyyy", { locale: ptBR }),
        predicted: predictedVariable,
        recurring: recurringMonthlyTotal,
        total,
        isProjection: true,
        confidence,
      });
    }

    return result;
  }, [historicalData, recurringMonthlyTotal]);

  // Calculate insights
  const insights = useMemo(() => {
    const results: { type: "warning" | "tip" | "goal"; message: string }[] = [];

    // Average spending
    const avgSpending =
      historicalData.reduce((sum, m) => sum + m.total, 0) /
      Math.max(historicalData.length, 1);

    // Projected next month
    const nextMonthForecast = forecast.find((f) => f.isProjection);

    if (nextMonthForecast && monthlyBudget > 0) {
      const percentOfBudget = (nextMonthForecast.total / monthlyBudget) * 100;
      if (percentOfBudget > 100) {
        results.push({
          type: "warning",
          message: `Previsão de gastos ${percentOfBudget.toFixed(0)}% do orçamento mensal para ${nextMonthForecast.fullMonth}`,
        });
      }
    }

    // Growing categories
    const growingCategories = categoryAnalysis
      .filter((c) => c.isGrowing && c.average > avgSpending * 0.1)
      .slice(0, 2);

    growingCategories.forEach((cat) => {
      results.push({
        type: "warning",
        message: `Gastos com ${cat.name} estão aumentando (média: R$ ${cat.average.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}/mês)`,
      });
    });

    // Recurring impact
    if (recurringMonthlyTotal > 0) {
      const recurringPercent = (recurringMonthlyTotal / avgSpending) * 100;
      if (recurringPercent > 50) {
        results.push({
          type: "tip",
          message: `${recurringPercent.toFixed(0)}% dos seus gastos são recorrentes (R$ ${recurringMonthlyTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}/mês)`,
        });
      }
    }

    // Savings potential
    const lowestMonth = Math.min(...historicalData.map((m) => m.total));
    const savingsPotential = avgSpending - lowestMonth;
    if (savingsPotential > avgSpending * 0.1) {
      results.push({
        type: "goal",
        message: `Potencial de economia: R$ ${savingsPotential.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}/mês baseado no seu melhor mês`,
      });
    }

    return results.slice(0, 4);
  }, [historicalData, categoryAnalysis, recurringMonthlyTotal, monthlyBudget, forecast]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as ForecastMonth;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2 capitalize">
            {data?.fullMonth}
          </p>
          <p className="text-xs text-muted-foreground">
            {data?.isProjection ? "Previsão" : "Realizado"}:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(data?.total || 0)}
            </span>
          </p>
          {data?.isProjection && data?.recurring > 0 && (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                Recorrentes: {formatCurrency(data.recurring)}
              </p>
              <p className="text-xs text-muted-foreground">
                Variáveis: {formatCurrency(data.predicted)}
              </p>
              <p className="text-xs text-primary mt-1">
                Confiança: {data.confidence}%
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const nextMonthForecast = forecast.find((f) => f.isProjection);
  const avgSpending =
    historicalData.reduce((sum, m) => sum + m.total, 0) /
    Math.max(historicalData.length, 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Média Mensal</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(avgSpending)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Próximo Mês</p>
              <p className="text-lg font-bold text-foreground">
                {nextMonthForecast ? formatCurrency(nextMonthForecast.total) : "—"}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gastos Fixos</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(recurringMonthlyTotal)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Forecast Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-4 lg:p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Previsão de Gastos</h3>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              {monthlyBudget > 0 && (
                <ReferenceLine
                  y={monthlyBudget}
                  stroke="hsl(var(--warning))"
                  strokeDasharray="5 5"
                  label={{
                    value: "Orçamento",
                    position: "right",
                    fill: "hsl(var(--warning))",
                    fontSize: 10,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorForecast)"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={payload.isProjection ? 6 : 4}
                      fill={
                        payload.isProjection
                          ? "hsl(var(--primary))"
                          : "hsl(var(--destructive))"
                      }
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Histórico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Previsão</span>
          </div>
          {monthlyBudget > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-warning" style={{ borderStyle: "dashed" }} />
              <span className="text-muted-foreground">Orçamento</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Insights */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Insights da Previsão
          </h3>
          <div className="grid gap-3">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                className={`glass-card p-4 flex items-start gap-3 ${
                  insight.type === "warning"
                    ? "border-l-4 border-l-warning"
                    : insight.type === "goal"
                    ? "border-l-4 border-l-success"
                    : "border-l-4 border-l-primary"
                }`}
              >
                {insight.type === "warning" ? (
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                ) : insight.type === "goal" ? (
                  <Target className="w-5 h-5 text-success shrink-0 mt-0.5" />
                ) : (
                  <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                )}
                <p className="text-sm text-foreground">{insight.message}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
