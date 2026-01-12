import { useState, useEffect, useCallback, useMemo } from "react";
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
  parent_category_id: string | null;
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

export const defaultCategories: Omit<Category, "id" | "user_id" | "created_at" | "parent_category_id">[] = [
  // === RECEITAS ===
  { name: "Renda Cliente", icon: "Users", color: "#00C896", type: "income" },
  { name: "Renda Cônjuge", icon: "Heart", color: "#00D4AA", type: "income" },
  { name: "Outras Fontes de Renda", icon: "CircleDollarSign", color: "#00E5BB", type: "income" },
  { name: "Resgate de Investimentos", icon: "TrendingUp", color: "#10B981", type: "income" },
  { name: "Transferência Mesma Titularidade", icon: "ArrowLeftRight", color: "#14B8A6", type: "income" },
  { name: "Reembolsos", icon: "RotateCcw", color: "#06B6D4", type: "income" },
  
  // === DESPESAS - Pessoais ===
  { name: "Alimentação", icon: "UtensilsCrossed", color: "#F97316", type: "expense" },
  { name: "Casa", icon: "Home", color: "#EF4444", type: "expense" },
  { name: "Casa de Veraneio", icon: "Palmtree", color: "#DC2626", type: "expense" },
  { name: "Cuidados Pessoais", icon: "Sparkles", color: "#EC4899", type: "expense" },
  { name: "Educação", icon: "GraduationCap", color: "#8B5CF6", type: "expense" },
  { name: "Filhos e Família", icon: "Baby", color: "#F472B6", type: "expense" },
  { name: "Impostos e Taxas", icon: "Receipt", color: "#6B7280", type: "expense" },
  { name: "Mercado", icon: "ShoppingCart", color: "#FB923C", type: "expense" },
  { name: "Pets", icon: "PawPrint", color: "#A78BFA", type: "expense" },
  { name: "Prestadores de Serviço", icon: "Wrench", color: "#64748B", type: "expense" },
  { name: "Profissional e Trabalho", icon: "Briefcase", color: "#3B82F6", type: "expense" },
  { name: "Saúde", icon: "HeartPulse", color: "#EF4444", type: "expense" },
  { name: "Despesas Médicas", icon: "Stethoscope", color: "#F43F5E", type: "expense" },
  { name: "Seguros", icon: "Shield", color: "#0EA5E9", type: "expense" },
  { name: "Transporte", icon: "Car", color: "#6366F1", type: "expense" },
  
  // === DESPESAS - Empresa ===
  { name: "Serviços Financeiros", icon: "Landmark", color: "#4F46E5", type: "expense" },
  { name: "Meios de Pagamento", icon: "CreditCard", color: "#7C3AED", type: "expense" },
  { name: "Infraestrutura", icon: "Building2", color: "#475569", type: "expense" },
  { name: "Ferramentas", icon: "Hammer", color: "#78716C", type: "expense" },
  { name: "Marketing", icon: "Megaphone", color: "#F59E0B", type: "expense" },
  { name: "Colaboradores", icon: "Users", color: "#0284C7", type: "expense" },
  { name: "Prestadores de Serviço – Empresa", icon: "UserCog", color: "#0891B2", type: "expense" },
  { name: "Taxas e Impostos", icon: "FileText", color: "#71717A", type: "expense" },
  { name: "Insumos e Outros", icon: "Package", color: "#92400E", type: "expense" },
  
  // === DESPESAS - Lifestyle ===
  { name: "Assinaturas e Serviços", icon: "CalendarCheck", color: "#A855F7", type: "expense" },
  { name: "Compras", icon: "ShoppingBag", color: "#D946EF", type: "expense" },
  { name: "Esportes", icon: "Dumbbell", color: "#22C55E", type: "expense" },
  { name: "Lazer", icon: "Gamepad2", color: "#06B6D4", type: "expense" },
  { name: "Presentes e Doações", icon: "Gift", color: "#E11D48", type: "expense" },
  { name: "Restaurantes", icon: "ChefHat", color: "#EA580C", type: "expense" },
  { name: "Tarifas Bancárias", icon: "Building", color: "#4B5563", type: "expense" },
  { name: "Vestuário", icon: "Shirt", color: "#DB2777", type: "expense" },
  { name: "Viagens", icon: "Plane", color: "#0EA5E9", type: "expense" },
  { name: "Outros", icon: "MoreHorizontal", color: "#9CA3AF", type: "expense" },
  
  // === PROJETOS ===
  { name: "Viagem-Projetos", icon: "MapPin", color: "#2DD4BF", type: "expense" },
  { name: "Veículo-Projetos", icon: "Car", color: "#38BDF8", type: "expense" },
  { name: "Casa-Projetos", icon: "HomeIcon", color: "#FB7185", type: "expense" },
  { name: "Família-Projetos", icon: "Users2", color: "#C084FC", type: "expense" },
  { name: "Eletrônicos-Projetos", icon: "Laptop", color: "#60A5FA", type: "expense" },
  { name: "Educação-Projetos", icon: "BookOpen", color: "#818CF8", type: "expense" },
  { name: "Hobby-Projetos", icon: "Palette", color: "#FB923C", type: "expense" },
  { name: "Profissional-Projetos", icon: "Target", color: "#34D399", type: "expense" },
  { name: "Saúde-Projetos", icon: "Activity", color: "#F87171", type: "expense" },
  { name: "Outros-Projetos", icon: "FolderOpen", color: "#A3A3A3", type: "expense" },
  
  // === FINANCIAMENTOS E DÍVIDAS ===
  { name: "Financiamento Imobiliário", icon: "Building2", color: "#BE185D", type: "expense" },
  { name: "Financiamento Veículo", icon: "CarFront", color: "#9333EA", type: "expense" },
  { name: "Dívidas e Empréstimos", icon: "Banknote", color: "#DC2626", type: "expense" },
  
  // === TRANSFERÊNCIAS E CARTÕES ===
  { name: "Pagamento Fatura de Cartão", icon: "CreditCard", color: "#6D28D9", type: "expense" },
  { name: "Despesas Reembolsáveis", icon: "Receipt", color: "#0369A1", type: "expense" },
  { name: "Aplicação em Investimentos", icon: "PiggyBank", color: "#059669", type: "expense" },
  
  // === SEM CLASSIFICAÇÃO ===
  { name: "Sem Classificação", icon: "HelpCircle", color: "#D4D4D4", type: "expense" },
];

export function useCategories() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Build hierarchical tree from flat list
  const categoriesTree = useMemo(() => {
    const map = new Map<string, CategoryWithChildren>();
    const roots: CategoryWithChildren[] = [];

    // First pass: create all nodes
    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    categories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parent_category_id && map.has(cat.parent_category_id)) {
        map.get(cat.parent_category_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort children by name
    const sortChildren = (nodes: CategoryWithChildren[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((n) => sortChildren(n.children));
    };
    sortChildren(roots);

    return roots;
  }, [categories]);

  // Get parent categories (categories without parent)
  const parentCategories = useMemo(() => {
    return categories.filter((c) => !c.parent_category_id);
  }, [categories]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCategories(data as Category[]);
    }

    setLoading(false);
  }, [user, toast]);

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
        parent_category_id: null,
      }));

      const { error } = await supabase
        .from("categories")
        .insert(categoriesToInsert);

      if (error) {
        console.error("Error creating default categories:", error);
        return;
      }
    }

    await fetchCategories();
  }, [user, fetchCategories]);

  const syncDefaultCategories = useCallback(async () => {
    if (!user) return false;

    setLoading(true);

    try {
      // Get existing categories
      const { data: existingCategories, error: fetchError } = await supabase
        .from("categories")
        .select("name")
        .eq("user_id", user.id);

      if (fetchError) {
        throw fetchError;
      }

      const existingNames = new Set(existingCategories?.map((c) => c.name.toLowerCase()) || []);

      // Find categories that don't exist yet
      const newCategories = defaultCategories.filter(
        (cat) => !existingNames.has(cat.name.toLowerCase())
      );

      if (newCategories.length === 0) {
        toast({
          title: "Categorias atualizadas",
          description: "Todas as categorias padrão já existem.",
        });
        setLoading(false);
        return true;
      }

      // Insert new categories
      const categoriesToInsert = newCategories.map((cat) => ({
        ...cat,
        user_id: user.id,
        parent_category_id: null,
      }));

      const { error: insertError } = await supabase
        .from("categories")
        .insert(categoriesToInsert);

      if (insertError) {
        throw insertError;
      }

      await fetchCategories();

      toast({
        title: "Categorias sincronizadas",
        description: `${newCategories.length} novas categorias foram adicionadas.`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar categorias",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, fetchCategories]);

  const addCategory = async (
    category: Omit<Category, "id" | "user_id" | "created_at">
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("categories")
      .insert({
        ...category,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setCategories((prev) => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    toast({
      title: "Categoria criada",
      description: "Sua categoria foi adicionada com sucesso.",
    });
    return data as Category;
  };

  const updateCategory = async (
    id: string,
    updates: Partial<Omit<Category, "id" | "user_id" | "created_at">>
  ) => {
    if (!user) return null;

    // Prevent circular reference
    if (updates.parent_category_id === id) {
      toast({
        title: "Erro",
        description: "Uma categoria não pode ser sua própria subcategoria.",
        variant: "destructive",
      });
      return null;
    }

    // Check if trying to set parent as one of its children
    if (updates.parent_category_id) {
      const isChild = (parentId: string, targetId: string): boolean => {
        const children = categories.filter((c) => c.parent_category_id === parentId);
        for (const child of children) {
          if (child.id === targetId || isChild(child.id, targetId)) {
            return true;
          }
        }
        return false;
      };

      if (isChild(id, updates.parent_category_id)) {
        toast({
          title: "Erro",
          description: "Não é possível mover uma categoria para dentro de uma de suas subcategorias.",
          variant: "destructive",
        });
        return null;
      }
    }

    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === id ? (data as Category) : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
    toast({
      title: "Categoria atualizada",
      description: "Sua categoria foi modificada com sucesso.",
    });
    return data as Category;
  };

  const deleteCategory = async (id: string) => {
    if (!user) return false;

    // Check if category has children
    const hasChildren = categories.some((c) => c.parent_category_id === id);
    if (hasChildren) {
      toast({
        title: "Não é possível excluir",
        description: "Esta categoria possui subcategorias. Remova as subcategorias primeiro.",
        variant: "destructive",
      });
      return false;
    }

    // Check if category is in use
    const { data: transactions } = await supabase
      .from("transactions")
      .select("id")
      .eq("category_id", id)
      .limit(1);

    if (transactions && transactions.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Esta categoria está sendo usada em transações. Remova ou altere as transações primeiro.",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast({
      title: "Categoria excluída",
      description: "Sua categoria foi removida com sucesso.",
    });
    return true;
  };

  // Get full path of a category (for display)
  const getCategoryPath = useCallback((categoryId: string): string => {
    const paths: string[] = [];
    let current = categories.find((c) => c.id === categoryId);
    
    while (current) {
      paths.unshift(current.name);
      current = current.parent_category_id 
        ? categories.find((c) => c.id === current!.parent_category_id)
        : undefined;
    }
    
    return paths.join(" > ");
  }, [categories]);

  // Get children of a category
  const getChildren = useCallback((categoryId: string): Category[] => {
    return categories.filter((c) => c.parent_category_id === categoryId);
  }, [categories]);

  useEffect(() => {
    initializeCategories();
  }, [initializeCategories]);

  return {
    categories,
    categoriesTree,
    parentCategories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    syncDefaultCategories,
    getCategoryPath,
    getChildren,
    refetch: fetchCategories,
  };
}
