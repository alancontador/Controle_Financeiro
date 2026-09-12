import { useState, useEffect, useCallback } from "react";
import { FALLBACK_CATEGORY, normalizeDescription } from "@/lib/pdf/categorize";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Category, defaultCategories } from "@/hooks/useCategories";

export type { Category };

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  notes: string | null;
  /** Quem gastou; null = Casa/Comum. */
  holder_name: string | null;
  card_last_four: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

/** Campos de escrita: pessoa e cartao sao opcionais (lancamento manual pode nao ter). */
export type TransactionInput = Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at" | "category" | "holder_name" | "card_last_four"> & {
  holder_name?: string | null;
  card_last_four?: string | null;
};

export interface TransactionFilters {
  type: "all" | "income" | "expense";
  categoryId: string | null;
  /** "all" | nome da pessoa | "__common" (sem pessoa). */
  person: string;
  startDate: Date | null;
  endDate: Date | null;
  search: string;
}

/** Grava a escolha de categoria do usuario para reconhecer a mesma despesa no futuro. */
async function rememberCategory(userId: string, description: string, categoryName: string | undefined) {
  if (!categoryName || categoryName === FALLBACK_CATEGORY) return;
  const key = normalizeDescription(description);
  if (!key) return;
  await supabase
    .from("category_memory")
    .upsert({ user_id: userId, key, category_name: categoryName, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
}

export function useTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: "all",
    categoryId: null,
    person: "all",
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

    if (filters.person === "__common") {
      query = query.is("holder_name", null);
    } else if (filters.person !== "all") {
      query = query.eq("holder_name", filters.person);
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
    transaction: TransactionInput
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
    {
      const saved = data as Transaction;
      if (saved.type === "expense" && saved.category?.name) void rememberCategory(user.id, saved.description, saved.category.name);
    }
    toast({
      title: "Transação adicionada",
      description: "Sua transação foi registrada com sucesso.",
    });
    return data as Transaction;
  };

  const updateTransaction = async (
    id: string,
    updates: Partial<TransactionInput>
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
    {
      // Trocar a pessoa de uma despesa vinda de fatura realoca a compra na fatura tambem.
      const saved = data as Transaction & { invoice_item_id?: string | null };
      if ("holder_name" in updates && saved.invoice_item_id) {
        const { data: item } = await supabase.from("invoice_items").select("holder_name").eq("id", saved.invoice_item_id).maybeSingle();
        const assigned = saved.holder_name && saved.holder_name !== item?.holder_name ? saved.holder_name : null;
        await supabase.from("invoice_items").update({ assigned_to: assigned }).eq("id", saved.invoice_item_id);
      }
    }
    {
      // Trocar a categoria de uma despesa ensina o app para a proxima fatura.
      const saved = data as Transaction;
      if (saved.type === "expense" && "category_id" in updates && saved.category?.name) {
        void rememberCategory(user.id, saved.description, saved.category.name);
      }
    }
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
    transactionsToImport: TransactionInput[]
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
