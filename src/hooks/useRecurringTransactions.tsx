import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Category } from "@/hooks/useTransactions";

export interface RecurringTransaction {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: "income" | "expense";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  day_of_month: number | null;
  day_of_week: number | null;
  notes: string | null;
  is_active: boolean;
  next_execution_date: string;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export function useRecurringTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecurringTransactions = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("recurring_transactions")
      .select("*, category:categories(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching recurring transactions:", error);
      toast({
        title: "Erro ao carregar transações recorrentes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRecurringTransactions(data as RecurringTransaction[]);
    }

    setLoading(false);
  }, [user, toast]);

  const addRecurringTransaction = async (
    transaction: Omit<RecurringTransaction, "id" | "user_id" | "created_at" | "updated_at" | "last_executed_at" | "category">
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("recurring_transactions")
      .insert({
        ...transaction,
        user_id: user.id,
      })
      .select("*, category:categories(*)")
      .single();

    if (error) {
      toast({
        title: "Erro ao adicionar transação recorrente",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setRecurringTransactions((prev) => [data as RecurringTransaction, ...prev]);
    toast({
      title: "Transação recorrente criada",
      description: "Sua transação recorrente foi configurada com sucesso.",
    });
    return data as RecurringTransaction;
  };

  const updateRecurringTransaction = async (
    id: string,
    updates: Partial<Omit<RecurringTransaction, "id" | "user_id" | "created_at" | "updated_at" | "category">>
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("recurring_transactions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*, category:categories(*)")
      .single();

    if (error) {
      toast({
        title: "Erro ao atualizar transação recorrente",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setRecurringTransactions((prev) =>
      prev.map((t) => (t.id === id ? (data as RecurringTransaction) : t))
    );
    toast({
      title: "Transação recorrente atualizada",
      description: "Sua transação recorrente foi atualizada com sucesso.",
    });
    return data as RecurringTransaction;
  };

  const deleteRecurringTransaction = async (id: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("recurring_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Erro ao excluir transação recorrente",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setRecurringTransactions((prev) => prev.filter((t) => t.id !== id));
    toast({
      title: "Transação recorrente excluída",
      description: "Sua transação recorrente foi removida com sucesso.",
    });
    return true;
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    return updateRecurringTransaction(id, { is_active: isActive });
  };

  useEffect(() => {
    if (user) {
      fetchRecurringTransactions();
    }
  }, [user, fetchRecurringTransactions]);

  return {
    recurringTransactions,
    loading,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleActive,
    refetch: fetchRecurringTransactions,
  };
}
