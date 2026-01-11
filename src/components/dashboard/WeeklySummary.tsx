import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  TrendingDown, 
  TrendingUp, 
  ArrowRight,
  Flame,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, subWeeks, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WeeklyData {
  totalExpenses: number;
  totalIncome: number;
  lastWeekExpenses: number;
  lastWeekIncome: number;
  topCategories: { name: string; amount: number; color: string }[];
  dailyAverage: number;
  bestDay: { day: string; amount: number } | null;
  worstDay: { day: string; amount: number } | null;
}

export function WeeklySummary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeeklyData | null>(null);

  useEffect(() => {
    async function fetchWeeklyData() {
      if (!user) return;

      setLoading(true);
      try {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
        const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });

        // Fetch this week's transactions
        const { data: thisWeek, error: thisWeekError } = await supabase
          .from("transactions")
          .select("*, category:categories(*)")
          .eq("user_id", user.id)
          .gte("date", format(weekStart, "yyyy-MM-dd"))
          .lte("date", format(weekEnd, "yyyy-MM-dd"));

        if (thisWeekError) throw thisWeekError;

        // Fetch last week's transactions
        const { data: lastWeek, error: lastWeekError } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", user.id)
          .gte("date", format(lastWeekStart, "yyyy-MM-dd"))
          .lte("date", format(lastWeekEnd, "yyyy-MM-dd"));

        if (lastWeekError) throw lastWeekError;

        // Calculate this week stats
        const expenses = (thisWeek || []).filter((t) => t.type === "expense");
        const income = (thisWeek || []).filter((t) => t.type === "income");

        const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);

        // Last week stats
        const lastWeekExpenses = (lastWeek || [])
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const lastWeekIncome = (lastWeek || [])
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        // Top categories
        const categoryTotals: Record<string, { amount: number; color: string }> = {};
        expenses.forEach((t: any) => {
          const catName = t.category?.name || "Outros";
          const catColor = t.category?.color || "#6B46FF";
          if (!categoryTotals[catName]) {
            categoryTotals[catName] = { amount: 0, color: catColor };
          }
          categoryTotals[catName].amount += Number(t.amount);
        });

        const topCategories = Object.entries(categoryTotals)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);

        // Daily spending for best/worst day
        const dailySpending: Record<string, number> = {};
        expenses.forEach((t: any) => {
          const day = t.date;
          dailySpending[day] = (dailySpending[day] || 0) + Number(t.amount);
        });

        const days = Object.entries(dailySpending);
        let bestDay = null;
        let worstDay = null;

        if (days.length > 0) {
          const sorted = days.sort((a, b) => a[1] - b[1]);
          bestDay = {
            day: format(parseISO(sorted[0][0]), "EEEE", { locale: ptBR }),
            amount: sorted[0][1],
          };
          worstDay = {
            day: format(parseISO(sorted[sorted.length - 1][0]), "EEEE", { locale: ptBR }),
            amount: sorted[sorted.length - 1][1],
          };
        }

        const daysWithExpenses = Object.keys(dailySpending).length || 1;
        const dailyAverage = totalExpenses / daysWithExpenses;

        setData({
          totalExpenses,
          totalIncome,
          lastWeekExpenses,
          lastWeekIncome,
          topCategories,
          dailyAverage,
          bestDay,
          worstDay,
        });
      } catch (error) {
        console.error("Error fetching weekly data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeeklyData();
  }, [user]);

  const comparison = useMemo(() => {
    if (!data) return { percentage: 0, isPositive: true };
    if (data.lastWeekExpenses === 0) return { percentage: 0, isPositive: true };

    const diff = data.totalExpenses - data.lastWeekExpenses;
    const percentage = (diff / data.lastWeekExpenses) * 100;
    return {
      percentage: Math.abs(percentage),
      isPositive: diff <= 0, // Less spending is positive
    };
  }, [data]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-24" />
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Resumo da Semana
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {format(startOfWeek(new Date(), { weekStartsOn: 0 }), "dd MMM", { locale: ptBR })} -{" "}
              {format(endOfWeek(new Date(), { weekStartsOn: 0 }), "dd MMM", { locale: ptBR })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-muted-foreground mb-1">Gastos</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(data.totalExpenses)}</p>
              <div className="flex items-center gap-1 mt-1">
                {comparison.isPositive ? (
                  <TrendingDown className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    comparison.isPositive ? "text-green-500" : "text-destructive"
                  )}
                >
                  {comparison.percentage.toFixed(0)}% vs semana passada
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Receitas</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(data.totalIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo: {formatCurrency(data.totalIncome - data.totalExpenses)}
              </p>
            </div>
          </div>

          {/* Top Categories */}
          {data.topCategories.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Principais Gastos
              </p>
              <div className="space-y-2">
                {data.topCategories.map((cat, i) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-foreground">{cat.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(cat.amount)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="grid grid-cols-2 gap-3">
            {data.bestDay && (
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Melhor dia</span>
                </div>
                <p className="text-sm text-foreground capitalize">{data.bestDay.day}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(data.bestDay.amount)}</p>
              </div>
            )}

            {data.worstDay && data.worstDay.day !== data.bestDay?.day && (
              <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs font-medium text-destructive">Mais gastos</span>
                </div>
                <p className="text-sm text-foreground capitalize">{data.worstDay.day}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(data.worstDay.amount)}</p>
              </div>
            )}
          </div>

          {/* Daily Average */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Média diária</span>
            <span className="text-sm font-semibold text-foreground">
              {formatCurrency(data.dailyAverage)}
            </span>
          </div>

          <Link to="/transactions" className="block">
            <Button variant="outline" size="sm" className="w-full gap-2">
              Ver Transações
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
