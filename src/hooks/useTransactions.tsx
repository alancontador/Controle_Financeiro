import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface TransactionFilters {
  type: "all" | "income" | "expense";
  categoryId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  search: string;
}

const defaultCategories: Omit<Category, "id" | "user_id" | "created_at">[] = [
  { name: "Salário", icon: "Wallet", color: "#00C896", type: "income" },
  { name: "Freelance", icon: "Briefcase", color: "#00C896", type: "income" },
  { name: "Investimentos", icon: "TrendingUp", color: "#00C896", type: "income" },
  { name: "Outros", icon: "Plus", color: "#00C896", type: "income" },
  { name: "Alimentação", icon: "UtensilsCrossed", color: "#FF4F4F", type: "expense" },
  { name: "Transporte", icon: "Car", color: "#FF4F4F", type: "expense" },
  { name: "Moradia", icon: "Home", color: "#FF4F4F", type: "expense" },
  { name: "Saúde", icon: "Heart", color: "#FF4F4F", type: "expense" },
  { name: "Educação", icon: "GraduationCap", color: "#FF4F4F", type: "expense" },
  { name: "Lazer", icon: "Gamepad2", color: "#FF4F4F", type: "expense" },
  { name: "Compras", icon: "ShoppingBag", color: "#FF4F4F", type: "expense" },
  { name: "Serviços", icon: "Settings", color: "#FF4F4F", type: "expense" },
];

export function useTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: "all",
    categoryId: null,
    startDate: null,
    endDate: null,
    search: "",
  });

  const initializeCategories = useCallback(async () => {
    if (!user) return;

    const { data: existingCategories } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id);

    if (!existingCategories || existingCategories.length === 0) {
      const categoriesToInsert = defaultCategories.map((cat) => ({
        ...cat,
        user_id: user.id,
      }));

      const { data: newCategories, error } = await supabase
        .from("categories")
        .insert(categoriesToInsert)
        .select();

      if (error) {
        console.error("Error creating default categories:", error);
        return;
      }

      setCategories(newCategories as Category[]);
    } else {
      setCategories(existingCategories as Category[]);
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    
    let query = supabase
      .from("transactions")
      .select("*, category:categories(*)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (filters.type !== "all") {
      query = query.eq("type", filters.type);
    }

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    if (filters.startDate) {
      query = query.gte("date", filters.startDate.toISOString().split("T")[0]);
    }

    if (filters.endDate) {
      query = query.lte("date", filters.endDate.toISOString().split("T")[0]);
    }

    if (filters.search) {
      query = query.ilike("description", `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Erro ao carregar transações",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTransactions(data as Transaction[]);
    }

    setLoading(false);
  }, [user, filters, toast]);

  const addTransaction = async (
    transaction: Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at" | "category">
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        ...transaction,
        user_id: user.id,
      })
      .select("*, category:categories(*)")
      .single();

    if (error) {
      toast({
        title: "Erro ao adicionar transação",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setTransactions((prev) => [data as Transaction, ...prev]);
    toast({
      title: "Transação adicionada",
      description: "Sua transação foi registrada com sucesso.",
    });
    return data as Transaction;
  };

  const updateTransaction = async (
    id: string,
    updates: Partial<Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at" | "category">>
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*, category:categories(*)")
      .single();

    if (error) {
      toast({
        title: "Erro ao atualizar transação",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? (data as Transaction) : t))
    );
    toast({
      title: "Transação atualizada",
      description: "Sua transação foi atualizada com sucesso.",
    });
    return data as Transaction;
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Erro ao excluir transação",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast({
      title: "Transação excluída",
      description: "Sua transação foi removida com sucesso.",
    });
    return true;
  };

  const importTransactions = async (
    transactionsToImport: Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at" | "category">[]
  ) => {
    if (!user) return false;

    const dataToInsert = transactionsToImport.map((t) => ({
      ...t,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from("transactions")
      .insert(dataToInsert)
      .select("*, category:categories(*)");

    if (error) {
      toast({
        title: "Erro ao importar transações",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setTransactions((prev) => [...(data as Transaction[]), ...prev]);
    toast({
      title: "Transações importadas",
      description: `${data.length} transações foram importadas com sucesso.`,
    });
    return true;
  };

  useEffect(() => {
    initializeCategories();
  }, [initializeCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      fetchTransactions();
    }
  }, [categories, fetchTransactions]);

  return {
    transactions,
    categories,
    loading,
    filters,
    setFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactions,
    refetch: fetchTransactions,
  };
}
