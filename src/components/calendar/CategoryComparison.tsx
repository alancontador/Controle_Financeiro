import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Transaction, Category } from "@/hooks/useTransactions";

interface CategoryComparisonProps {
  transactions: Transaction[];
  categories: Category[];
}

interface MonthlyCategory {
  category: string;
  categoryId: string;
  color: string;
  amount: number;
}

interface ComparisonData {
  category: string;
  month1: number;
  month2: number;
  difference: number;
  percentChange: number;
}

export const CategoryComparison = ({
  transactions,
  categories,
}: CategoryComparisonProps) => {
  const [month1, setMonth1] = useState(() => subMonths(new Date(), 1));
  const [month2, setMonth2] = useState(() => new Date());

  const getMonthData = useMemo(() => {
    const getExpensesByCategory = (date: Date) => {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const monthTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.date);
        return (
          t.type === "expense" &&
          transactionDate >= monthStart &&
          transactionDate <= monthEnd
        );
      });

      const categoryTotals: Record<string, number> = {};
      monthTransactions.forEach((t) => {
        const categoryName = t.category?.name || "Sem categoria";
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + Number(t.amount);
      });

      return categoryTotals;
    };

    const month1Data = getExpensesByCategory(month1);
    const month2Data = getExpensesByCategory(month2);

    // Get all unique categories
    const allCategories = new Set([
      ...Object.keys(month1Data),
      ...Object.keys(month2Data),
    ]);

    const comparisonData: ComparisonData[] = Array.from(allCategories)
      .map((category) => {
        const m1 = month1Data[category] || 0;
        const m2 = month2Data[category] || 0;
        const difference = m2 - m1;
        const percentChange = m1 > 0 ? ((m2 - m1) / m1) * 100 : m2 > 0 ? 100 : 0;

        return {
          category,
          month1: m1,
          month2: m2,
          difference,
          percentChange,
        };
      })
      .sort((a, b) => b.month2 - a.month2);

    return comparisonData;
  }, [transactions, month1, month2]);

  const radarData = useMemo(() => {
    return getMonthData.slice(0, 6).map((item) => ({
      category: item.category.length > 10 ? item.category.substring(0, 10) + "..." : item.category,
      fullCategory: item.category,
      [format(month1, "MMM", { locale: ptBR })]: item.month1,
      [format(month2, "MMM", { locale: ptBR })]: item.month2,
    }));
  }, [getMonthData, month1, month2]);

  const totalMonth1 = useMemo(
    () => getMonthData.reduce((sum, item) => sum + item.month1, 0),
    [getMonthData]
  );

  const totalMonth2 = useMemo(
    () => getMonthData.reduce((sum, item) => sum + item.month2, 0),
    [getMonthData]
  );

  const totalDifference = totalMonth2 - totalMonth1;
  const totalPercentChange =
    totalMonth1 > 0 ? ((totalMonth2 - totalMonth1) / totalMonth1) * 100 : 0;

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* Month Selectors */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Selecione os meses para comparação
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Month 1 Selector */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonth1(subMonths(month1, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium capitalize">
              {format(month1, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonth1(subMonths(month1, -1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Month 2 Selector */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonth2(subMonths(month2, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium capitalize">
              {format(month2, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonth2(subMonths(month2, -1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-muted-foreground mb-1 capitalize">
            {format(month1, "MMMM", { locale: ptBR })}
          </p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalMonth1)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-muted-foreground mb-1 capitalize">
            {format(month2, "MMMM", { locale: ptBR })}
          </p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalMonth2)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-muted-foreground mb-1">Variação</p>
          <div className="flex items-center gap-2">
            {totalDifference > 0 ? (
              <TrendingUp className="w-4 h-4 text-destructive" />
            ) : totalDifference < 0 ? (
              <TrendingDown className="w-4 h-4 text-success" />
            ) : (
              <Minus className="w-4 h-4 text-muted-foreground" />
            )}
            <p
              className={`text-lg font-bold ${
                totalDifference > 0
                  ? "text-destructive"
                  : totalDifference < 0
                  ? "text-success"
                  : "text-muted-foreground"
              }`}
            >
              {totalDifference > 0 ? "+" : ""}
              {totalPercentChange.toFixed(1)}%
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-4 lg:p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Comparação por Categoria
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getMonthData.slice(0, 8)}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [formatCurrency(value), ""]}
                labelFormatter={(label) => `Categoria: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="month1"
                name={format(month1, "MMM yyyy", { locale: ptBR })}
                fill="hsl(var(--muted-foreground))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="month2"
                name={format(month2, "MMM yyyy", { locale: ptBR })}
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Radar Chart */}
      {radarData.length > 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 lg:p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Perfil de Gastos
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                />
                <Radar
                  name={format(month1, "MMM", { locale: ptBR })}
                  dataKey={format(month1, "MMM", { locale: ptBR })}
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.3}
                />
                <Radar
                  name={format(month2, "MMM", { locale: ptBR })}
                  dataKey={format(month2, "MMM", { locale: ptBR })}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), ""]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Detailed Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-4 lg:p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Detalhamento por Categoria
        </h3>
        <div className="space-y-2">
          {getMonthData.map((item, index) => (
            <motion.div
              key={item.category}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.category}</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {format(month1, "MMM", { locale: ptBR })}: {formatCurrency(item.month1)}
                  </span>
                  <span className="text-xs text-foreground">
                    {format(month2, "MMM", { locale: ptBR })}: {formatCurrency(item.month2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.difference > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-destructive" />
                ) : item.difference < 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-success" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    item.difference > 0
                      ? "text-destructive"
                      : item.difference < 0
                      ? "text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.difference > 0 ? "+" : ""}
                  {item.percentChange.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
