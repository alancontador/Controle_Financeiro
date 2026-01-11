import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyComparison as MonthlyComparisonType } from "@/hooks/useReports";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MonthlyComparisonProps {
  currentMonth: MonthlyComparisonType | null;
  previousMonths: MonthlyComparisonType[];
}

export function MonthlyComparison({ currentMonth, previousMonths }: MonthlyComparisonProps) {
  const allMonths = currentMonth 
    ? [...previousMonths.slice().reverse(), currentMonth] 
    : previousMonths.slice().reverse();

  const chartData = allMonths.map((month) => ({
    name: month.monthLabel.split(" ")[0].substring(0, 3),
    fullName: month.monthLabel,
    receitas: month.totalIncome,
    despesas: month.totalExpense,
    saldo: month.balance,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  // Calculate month-over-month change
  const getVariation = () => {
    if (!currentMonth || previousMonths.length === 0) return null;
    
    const prevMonth = previousMonths[0];
    if (prevMonth.totalExpense === 0) return null;
    
    const variation = ((currentMonth.totalExpense - prevMonth.totalExpense) / prevMonth.totalExpense) * 100;
    return variation;
  };

  const variation = getVariation();

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground text-lg">Comparativo Mensal</CardTitle>
        {variation !== null && (
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              variation > 0
                ? "bg-destructive/10 text-destructive"
                : variation < 0
                ? "bg-accent/10 text-accent"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {variation > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : variation < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span>
              {variation > 0 ? "+" : ""}
              {variation.toFixed(1)}% gastos
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {allMonths.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível para comparação
          </div>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 20%)" />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(240, 5%, 65%)"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    stroke="hsl(240, 5%, 65%)"
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(240, 6%, 7%)",
                      border: "1px solid hsl(240, 4%, 16%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullName;
                      }
                      return label;
                    }}
                    labelStyle={{ color: "hsl(0, 0%, 91%)" }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    formatter={(value) => (
                      <span className="text-muted-foreground text-sm capitalize">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="receitas"
                    fill="hsl(160, 100%, 39%)"
                    radius={[4, 4, 0, 0]}
                    name="Receitas"
                  />
                  <Bar
                    dataKey="despesas"
                    fill="hsl(0, 72%, 65%)"
                    radius={[4, 4, 0, 0]}
                    name="Despesas"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
              {allMonths.map((month, index) => (
                <motion.div
                  key={month.month}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg ${
                    index === allMonths.length - 1
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-secondary/50"
                  }`}
                >
                  <p className="text-muted-foreground text-xs mb-1">
                    {month.monthLabel.split(" ")[0].substring(0, 3)}
                  </p>
                  <p
                    className={`font-semibold text-sm ${
                      month.balance >= 0 ? "text-accent" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(month.balance)}
                  </p>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
