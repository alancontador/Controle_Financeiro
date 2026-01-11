import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface MonthlyData {
  month: string;
  monthFull: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface DashboardTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  dateLabel: string;
  category_name: string;
  category_icon: string;
  category_color: string;
}

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  lastMonthIncome: number;
  lastMonthExpenses: number;
  incomeChange: number;
  expenseChange: number;
  balanceChange: number;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all transactions with categories
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (transError) throw transError;

      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

      if (catError) throw catError;

      setAllTransactions(transactionsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate monthly chart data (last 7 months)
  const monthlyChartData = useMemo((): MonthlyData[] => {
    const months: MonthlyData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthTransactions = allTransactions.filter((t) => {
        const transDate = parseISO(t.date);
        return transDate >= monthStart && transDate <= monthEnd;
      });

      const receitas = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const despesas = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      months.push({
        month: format(monthDate, 'MMM', { locale: ptBR }),
        monthFull: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
        receitas,
        despesas,
        saldo: receitas - despesas,
      });
    }

    return months;
  }, [allTransactions]);

  // Calculate balance evolution data
  const balanceEvolution = useMemo(() => {
    if (allTransactions.length === 0) return [];

    // Sort by date ascending for cumulative calculation
    const sorted = [...allTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = 0;
    const dailyBalances: { date: string; balance: number; label: string }[] = [];
    const balanceByDate: Record<string, number> = {};

    sorted.forEach((t) => {
      const amount = t.type === 'income' ? Number(t.amount) : -Number(t.amount);
      runningBalance += amount;
      balanceByDate[t.date] = runningBalance;
    });

    Object.entries(balanceByDate).forEach(([date, balance]) => {
      dailyBalances.push({
        date,
        balance,
        label: format(parseISO(date), 'dd/MM', { locale: ptBR }),
      });
    });

    // Get last 30 data points max
    return dailyBalances.slice(-30);
  }, [allTransactions]);

  // Current month stats
  const stats = useMemo((): DashboardStats => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthTrans = allTransactions.filter((t) => {
      const transDate = parseISO(t.date);
      return transDate >= currentMonthStart && transDate <= currentMonthEnd;
    });

    const lastMonthTrans = allTransactions.filter((t) => {
      const transDate = parseISO(t.date);
      return transDate >= lastMonthStart && transDate <= lastMonthEnd;
    });

    const monthlyIncome = currentMonthTrans
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyExpenses = currentMonthTrans
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastMonthIncome = lastMonthTrans
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastMonthExpenses = lastMonthTrans
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalIncome = allTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = allTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const incomeChange = lastMonthIncome > 0
      ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100
      : 0;

    const expenseChange = lastMonthExpenses > 0
      ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : 0;

    const lastMonthBalance = lastMonthIncome - lastMonthExpenses;
    const currentBalance = monthlyIncome - monthlyExpenses;
    const balanceChange = lastMonthBalance !== 0
      ? ((currentBalance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100
      : 0;

    return {
      totalBalance: totalIncome - totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance: monthlyIncome - monthlyExpenses,
      lastMonthIncome,
      lastMonthExpenses,
      incomeChange,
      expenseChange,
      balanceChange,
    };
  }, [allTransactions]);

  // Category breakdown for current month expenses
  const expensesByCategory = useMemo((): CategoryBreakdown[] => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthExpenses = allTransactions.filter((t) => {
      const transDate = parseISO(t.date);
      return t.type === 'expense' && transDate >= monthStart && transDate <= monthEnd;
    });

    const byCategory: Record<string, { amount: number; color: string; icon: string }> = {};

    monthExpenses.forEach((t) => {
      const catName = t.category?.name || 'Outros';
      const catColor = t.category?.color || '#6B46FF';
      const catIcon = t.category?.icon || 'Tag';

      if (!byCategory[catName]) {
        byCategory[catName] = { amount: 0, color: catColor, icon: catIcon };
      }
      byCategory[catName].amount += Number(t.amount);
    });

    const total = Object.values(byCategory).reduce((sum, cat) => sum + cat.amount, 0);

    return Object.entries(byCategory)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
        color: data.color,
        icon: data.icon,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [allTransactions]);

  // Recent transactions formatted for dashboard
  const recentTransactions = useMemo((): DashboardTransaction[] => {
    return allTransactions.slice(0, 5).map((t) => {
      const transDate = parseISO(t.date);
      let dateLabel = format(transDate, 'dd/MM', { locale: ptBR });

      if (isToday(transDate)) {
        dateLabel = 'Hoje';
      } else if (isYesterday(transDate)) {
        dateLabel = 'Ontem';
      } else {
        const diff = differenceInDays(new Date(), transDate);
        if (diff <= 7) {
          dateLabel = `${diff} dias atrás`;
        }
      }

      return {
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        date: t.date,
        dateLabel,
        category_name: t.category?.name || 'Outros',
        category_icon: t.category?.icon || 'Tag',
        category_color: t.category?.color || '#6B46FF',
      };
    });
  }, [allTransactions]);

  return {
    loading,
    stats,
    monthlyChartData,
    balanceEvolution,
    expensesByCategory,
    recentTransactions,
    refetch: fetchData,
  };
}
