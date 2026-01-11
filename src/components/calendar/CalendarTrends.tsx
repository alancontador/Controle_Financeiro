import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
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
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Transaction } from "@/hooks/useTransactions";

interface CalendarTrendsProps {
  transactions: Transaction[];
  currentMonth: Date;
}

export function CalendarTrends({ transactions, currentMonth }: CalendarTrendsProps) {
  // Daily trend data for current month
  const dailyData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayTransactions = transactions.filter((t) => t.date === dateStr);

      const income = dayTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = dayTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        date: format(date, "dd"),
        fullDate: format(date, "dd/MM", { locale: ptBR }),
        income,
        expense,
        balance: income - expense,
      };
    });
  }, [transactions, currentMonth]);

  // Weekly trend data for last 8 weeks
  const weeklyData = useMemo(() => {
    const endDate = endOfMonth(currentMonth);
    const startDate = subMonths(startOfMonth(currentMonth), 2);
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { locale: ptBR });

    return weeks.slice(-8).map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { locale: ptBR });
      const weekTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= weekStart && transactionDate <= weekEnd;
      });

      const income = weekTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = weekTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        week: format(weekStart, "dd/MM", { locale: ptBR }),
        income,
        expense,
      };
    });
  }, [transactions, currentMonth]);

  // Monthly comparison (last 6 months)
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(currentMonth, i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      const income = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      months.push({
        month: format(month, "MMM", { locale: ptBR }),
        income,
        expense,
        balance: income - expense,
      });
    }
    return months;
  }, [transactions, currentMonth]);

  // Cumulative balance for the month
  const cumulativeData = useMemo(() => {
    let runningBalance = 0;
    return dailyData.map((day) => {
      runningBalance += day.balance;
      return {
        ...day,
        cumulative: runningBalance,
      };
    });
  }, [dailyData]);

  // Calculate trend
  const trend = useMemo(() => {
    if (monthlyData.length < 2) return { direction: "neutral", percentage: 0 };
    
    const current = monthlyData[monthlyData.length - 1]?.expense || 0;
    const previous = monthlyData[monthlyData.length - 2]?.expense || 0;
    
    if (previous === 0) return { direction: "neutral", percentage: 0 };
    
    const percentage = ((current - previous) / previous) * 100;
    return {
      direction: percentage > 0 ? "up" : percentage < 0 ? "down" : "neutral",
      percentage: Math.abs(percentage),
    };
  }, [monthlyData]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Trend Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                trend.direction === "down" ? "bg-success/10" : "bg-destructive/10"
              }`}
            >
              {trend.direction === "down" ? (
                <TrendingDown className="w-5 h-5 text-success" />
              ) : (
                <TrendingUp className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Tendência de Gastos</p>
              <p className="text-xs text-muted-foreground">Comparado ao mês anterior</p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-lg font-bold ${
                trend.direction === "down" ? "text-success" : "text-destructive"
              }`}
            >
              {trend.direction === "down" ? "-" : "+"}
              {trend.percentage.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {trend.direction === "down" ? "Redução" : "Aumento"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Balance Evolution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Evolução Diária do Saldo</h3>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Saldo Acumulado"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorCumulative)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Comparativo Semanal</h3>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="week"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
                <Bar
                  dataKey="income"
                  name="Receitas"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="Despesas"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 lg:col-span-2"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Tendência dos Últimos 6 Meses</h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
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
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Receitas"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--success))" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Despesas"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--destructive))" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Saldo"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
