import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Wallet, PieChart } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBudgets, BudgetWithSpending } from "@/hooks/useBudgets";
import { BudgetCard } from "@/components/budgets/BudgetCard";
import { BudgetModal } from "@/components/budgets/BudgetModal";
import { BudgetAlerts } from "@/components/budgets/BudgetAlerts";
import { DeleteConfirmModal } from "@/components/transactions/DeleteConfirmModal";
import { PersonSelect } from "@/components/people/PersonSelect";
import { Link } from "react-router-dom";

export default function Budgets() {
  const { user, loading: authLoading } = useAuth();
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const {
    budgets,
    categoriesWithoutBudget,
    overBudgetCategories,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    globalBudget,
    monthTotal,
  } = useBudgets(new Date(), personFilter);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpending | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<BudgetWithSpending | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSubmit = async (categoryId: string, amount: number, person: string | null) => {
    setIsSubmitting(true);
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, amount, person);
      } else {
        await addBudget(categoryId, amount, person);
      }
      setIsModalOpen(false);
      setEditingBudget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (budget: BudgetWithSpending) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBudget) return;
    setIsSubmitting(true);
    try {
      await deleteBudget(deletingBudget.id);
      setDeletingBudget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
  };

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-[var(--sidebar-w,16rem)] transition-[margin] duration-200 min-h-screen">
        <div className="p-4 lg:p-8 pt-20 lg:pt-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  Orçamentos
                </h1>
                <p className="text-muted-foreground text-sm">
                  Defina limites de gastos por categoria
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
            <PersonSelect value={personFilter} onChange={setPersonFilter} className="w-full sm:w-60 bg-card" />
            <Button
              onClick={() => setIsModalOpen(true)}
              className="glow-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
            </div>
          </motion.div>

          {/* Teto mensal da casa (Configuracoes) x gasto do mes */}
          {globalBudget > 0 && !personFilter && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Orçamento mensal da casa</p>
                  <p className="text-xs text-muted-foreground">Teto definido em <Link to="/settings" className="text-primary hover:underline">Configurações</Link> · gasto do mês (todas as categorias) {formatCurrency(monthTotal)} de {formatCurrency(globalBudget)}</p>
                </div>
                <span className={`text-sm font-bold ${monthTotal > globalBudget ? 'text-destructive' : 'text-foreground'}`}>{Math.round((monthTotal / globalBudget) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${monthTotal > globalBudget ? 'bg-destructive' : monthTotal / globalBudget > 0.8 ? 'bg-yellow-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, (monthTotal / globalBudget) * 100)}%` }} />
              </div>
              {totalBudget > globalBudget && <p className="text-xs text-amber-600 mt-2">A soma dos limites por categoria ({formatCurrency(totalBudget)}) passa do teto mensal da casa.</p>}
            </motion.div>
          )}

          {/* Alerts */}
          <BudgetAlerts overBudgetCategories={overBudgetCategories} />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-muted-foreground text-sm">Orçamento Total</span>
                  </div>
                  <p className="text-foreground text-2xl font-bold">{formatCurrency(totalBudget)}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <PieChart className="w-5 h-5 text-destructive" />
                    </div>
                    <span className="text-muted-foreground text-sm">Total Gasto</span>
                  </div>
                  <p className="text-foreground text-2xl font-bold">{formatCurrency(totalSpent)}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${totalRemaining >= 0 ? "bg-accent/10" : "bg-destructive/10"}`}>
                      <Wallet className={`w-5 h-5 ${totalRemaining >= 0 ? "text-accent" : "text-destructive"}`} />
                    </div>
                    <span className="text-muted-foreground text-sm">Disponível</span>
                  </div>
                  <p className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-accent" : "text-destructive"}`}>
                    {formatCurrency(Math.max(0, totalRemaining))}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Budget Cards */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : budgets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 text-center"
            >
              <div className="p-4 rounded-2xl bg-secondary/50 mb-4">
                <Wallet className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-foreground text-lg font-semibold mb-2">
                Nenhum orçamento definido
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-4">
                Crie orçamentos para categorias de despesa e receba alertas quando exceder os limites.
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="glow-primary">
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro orçamento
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.map((budget, index) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onEdit={handleEdit}
                  onDelete={setDeletingBudget}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        categories={editingBudget ? [editingBudget.category!].filter(Boolean) : categoriesWithoutBudget}
        budget={editingBudget}
        isLoading={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={!!deletingBudget}
        onClose={() => setDeletingBudget(null)}
        onConfirm={handleDelete}
        title="Excluir orçamento"
        description={`Tem certeza que deseja excluir o orçamento de "${deletingBudget?.category?.name}"? Esta ação não pode ser desfeita.`}
        isLoading={isSubmitting}
      />
    </div>
  );
}
