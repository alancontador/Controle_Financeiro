import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyComparison {
  month: string;
  monthLabel: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoriesExpenses: CategoryExpense[];
}

export interface ReportData {
  selectedMonth: MonthlyComparison | null;
  previousMonths: MonthlyComparison[];
  loading: boolean;
}

export function useReports(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyComparison[]>([]);

  const fetchReportData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Fetch last 6 months of data
    const months: Date[] = [];
    for (let i = 0; i < 6; i++) {
      months.push(subMonths(selectedDate, i));
    }

    const startDate = format(startOfMonth(months[5]), "yyyy-MM-dd");
    const endDate = format(endOfMonth(months[0]), "yyyy-MM-dd");

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*, category:categories(*)")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching report data:", error);
      setLoading(false);
      return;
    }

    // Process data by month
    const monthlyStats: MonthlyComparison[] = months.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMMM yyyy", { locale: ptBR });

      const monthTransactions = (transactions || []).filter((t) => {
        const tDate = parseISO(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const totalIncome = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpense = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Group expenses by category
      const expensesByCategory = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce(
          (acc, t) => {
            const catId = t.category_id || "uncategorized";
            if (!acc[catId]) {
              acc[catId] = {
                categoryId: catId,
                categoryName: t.category?.name || "Sem Categoria",
                categoryColor: t.category?.color || "#888888",
                categoryIcon: t.category?.icon || "HelpCircle",
                amount: 0,
                transactionCount: 0,
              };
            }
            acc[catId].amount += Number(t.amount);
            acc[catId].transactionCount += 1;
            return acc;
          },
          {} as Record<string, Omit<CategoryExpense, "percentage">>
        );

      const categoriesExpenses: CategoryExpense[] = Object.values(expensesByCategory)
        .map((cat) => ({
          ...cat,
          percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        month: monthKey,
        monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        categoriesExpenses,
      };
    });

    setMonthlyData(monthlyStats);
    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const reportData = useMemo<ReportData>(() => {
    return {
      selectedMonth: monthlyData[0] || null,
      previousMonths: monthlyData.slice(1),
      loading,
    };
  }, [monthlyData, loading]);

  return {
    ...reportData,
    monthlyData,
    refetch: fetchReportData,
  };
}
