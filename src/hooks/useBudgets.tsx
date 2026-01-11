import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Category } from "@/hooks/useTransactions";

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  period: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface BudgetWithSpending extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export function useBudgets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "expense");

    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }

    setCategories((data as Category[]) || []);
  }, [user]);

  const fetchBudgets = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("budgets")
      .select("*, category:categories(*)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching budgets:", error);
      toast({
        title: "Erro ao carregar orçamentos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setBudgets((data as Budget[]) || []);
    }

    setLoading(false);
  }, [user, toast]);

  const fetchMonthlySpending = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const startDate = format(startOfMonth(now), "yyyy-MM-dd");
    const endDate = format(endOfMonth(now), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      console.error("Error fetching monthly spending:", error);
      return;
    }

    const spending: Record<string, number> = {};
    (data || []).forEach((t) => {
      const catId = t.category_id || "uncategorized";
      spending[catId] = (spending[catId] || 0) + Number(t.amount);
    });

    setMonthlySpending(spending);
  }, [user]);

  const addBudget = async (categoryId: string, amount: number) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: user.id,
        category_id: categoryId,
        amount,
        period: "monthly",
      })
      .select("*, category:categories(*)")
      .single();

    if (error) {
      toast({
        title: "Erro ao criar orçamento",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setBudgets((prev) => [...prev, data as Budget]);
    toast({
      title: "Orçamento criado",
      description: "Seu limite de categoria foi definido com sucesso.",
    });
    return data as Budget;
  };

  const updateBudget = async (id: string, amount: number) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("budgets")
      .update({ amount })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*, category:categories(*)")
      .single();

    if (error) {
      toast({
        title: "Erro ao atualizar orçamento",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setBudgets((prev) => prev.map((b) => (b.id === id ? (data as Budget) : b)));
    toast({
      title: "Orçamento atualizado",
      description: "O limite foi atualizado com sucesso.",
    });
    return data as Budget;
  };

  const deleteBudget = async (id: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Erro ao excluir orçamento",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setBudgets((prev) => prev.filter((b) => b.id !== id));
    toast({
      title: "Orçamento excluído",
      description: "O limite foi removido com sucesso.",
    });
    return true;
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      fetchBudgets();
      fetchMonthlySpending();
    }
  }, [categories, fetchBudgets, fetchMonthlySpending]);

  const budgetsWithSpending = useMemo<BudgetWithSpending[]>(() => {
    return budgets.map((budget) => {
      const spent = monthlySpending[budget.category_id || ""] || 0;
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const isOverBudget = spent > budget.amount;

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        isOverBudget,
      };
    });
  }, [budgets, monthlySpending]);

  const overBudgetCategories = useMemo(() => {
    return budgetsWithSpending.filter((b) => b.isOverBudget);
  }, [budgetsWithSpending]);

  const categoriesWithoutBudget = useMemo(() => {
    const budgetCategoryIds = new Set(budgets.map((b) => b.category_id));
    return categories.filter((c) => !budgetCategoryIds.has(c.id));
  }, [categories, budgets]);

  return {
    budgets: budgetsWithSpending,
    categories,
    categoriesWithoutBudget,
    overBudgetCategories,
    loading,
    monthlySpending,
    addBudget,
    updateBudget,
    deleteBudget,
    refetch: fetchBudgets,
  };
}
