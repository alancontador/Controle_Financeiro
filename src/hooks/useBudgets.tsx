import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Category } from "@/hooks/useTransactions";
import { COMMON_PERSON } from "@/lib/people";
import { notifyDataChanged, useDataChanged } from "@/lib/dataEvents";

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  period: string;
  /** Pessoa do orcamento; null = casa toda. */
  person: string | null;
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

/** Chave do gasto do mes: categoria + pessoa do orcamento. */
const spendKey = (categoryId: string | null, person: string | null) => `${categoryId ?? "uncategorized"}|${person ?? ""}`;

/**
 * @param month mes analisado (padrao: o atual) - o dashboard navega por mes.
 * @param personFilter mostra so os orcamentos de uma pessoa (null = todos).
 */
export function useBudgets(month: Date = new Date(), personFilter: string | null = null) {
  const { user } = useAuth();
  const monthKey = format(month, "yyyy-MM");
  const [globalBudget, setGlobalBudget] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
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

    const now = new Date(`${monthKey}-01T00:00:00`);
    const startDate = format(startOfMonth(now), "yyyy-MM-dd");
    const endDate = format(endOfMonth(now), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("transactions")
      .select("category_id, amount, holder_name")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      console.error("Error fetching monthly spending:", error);
      return;
    }

    // Gasto por categoria para a casa toda (pessoa null) e para cada pessoa que tem orcamento.
    const spending: Record<string, number> = {};
    let total = 0;
    (data || []).forEach((t) => {
      const amount = Number(t.amount);
      total += amount;
      const all = spendKey(t.category_id, null);
      spending[all] = (spending[all] || 0) + amount;
      const person = t.holder_name?.trim() || COMMON_PERSON;
      const mine = spendKey(t.category_id, person);
      spending[mine] = (spending[mine] || 0) + amount;
    });
    setMonthlySpending(spending);
    setMonthTotal(total);

    // Teto mensal da casa (Configuracoes > Orcamento Mensal).
    const { data: profile } = await supabase.from("profiles").select("monthly_budget").eq("id", user.id).maybeSingle();
    setGlobalBudget(Number(profile?.monthly_budget) || 0);
  }, [user, monthKey]);

  const addBudget = async (categoryId: string, amount: number, person: string | null = null) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: user.id,
        category_id: categoryId,
        amount,
        period: "monthly",
        person,
      })
      .select("*, category:categories(*)")
      .single();

    if (error) {
      toast({
        title: "Erro ao criar orçamento",
        description: error.code === "23505" ? "Já existe um orçamento dessa categoria para essa pessoa." : error.message,
        variant: "destructive",
      });
      return null;
    }

    setBudgets((prev) => [...prev, data as Budget]);
    notifyDataChanged("budgets");
    toast({
      title: "Orçamento criado",
      description: "Seu limite de categoria foi definido com sucesso.",
    });
    return data as Budget;
  };

  const updateBudget = async (id: string, amount: number, person?: string | null) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("budgets")
      .update(person === undefined ? { amount } : { amount, person })
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
    notifyDataChanged("budgets");
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
    notifyDataChanged("budgets");
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
  // Transacoes novas (ou fatura importada) mudam o gasto; orcamentos editados em outra tela tambem.
  useDataChanged(() => { fetchBudgets(); fetchMonthlySpending(); }, ["transactions", "cards", "budgets", "people"]);

  const budgetsWithSpending = useMemo<BudgetWithSpending[]>(() => {
    return budgets.filter((b) => !personFilter || (personFilter === COMMON_PERSON ? !b.person : b.person === personFilter)).map((budget) => {
      const spent = monthlySpending[spendKey(budget.category_id, budget.person)] || 0;
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
  }, [budgets, monthlySpending, personFilter]);

  const overBudgetCategories = useMemo(() => {
    return budgetsWithSpending.filter((b) => b.isOverBudget);
  }, [budgetsWithSpending]);

  // Categorias ainda sem orcamento para a casa toda (com pessoa, a mesma categoria pode repetir).
  const categoriesWithoutBudget = useMemo(() => {
    const budgetCategoryIds = new Set(budgets.filter((b) => !b.person).map((b) => b.category_id));
    return categories.filter((c) => !budgetCategoryIds.has(c.id));
  }, [categories, budgets]);

  return {
    budgets: budgetsWithSpending,
    categories,
    categoriesWithoutBudget,
    overBudgetCategories,
    loading,
    monthlySpending,
    /** Teto mensal da casa (Configuracoes) e o gasto total do mes, para comparar. */
    globalBudget,
    monthTotal,
    month: monthKey,
    addBudget,
    updateBudget,
    deleteBudget,
    refetch: fetchBudgets,
  };
}
