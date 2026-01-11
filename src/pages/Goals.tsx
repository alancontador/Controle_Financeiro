import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Loader2, Target, Trophy, TrendingUp, CheckCircle2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useGoals, Goal, GoalFormData } from "@/hooks/useGoals";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalModal } from "@/components/goals/GoalModal";
import { ContributionModal } from "@/components/goals/ContributionModal";
import { DeleteConfirmModal } from "@/components/transactions/DeleteConfirmModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Goals = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    stats,
    goalCategories,
  } = useGoals();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);
  const overallProgress = stats.totalTargetAmount > 0 
    ? (stats.totalCurrentAmount / stats.totalTargetAmount) * 100 
    : 0;

  const handleSubmit = async (data: GoalFormData) => {
    setIsSubmitting(true);
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, data);
      } else {
        await addGoal(data);
      }
      setEditingGoal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;
    setIsSubmitting(true);
    try {
      await deleteGoal(deletingGoal.id);
      setDeletingGoal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribution = async (goalId: string, amount: number) => {
    setIsSubmitting(true);
    try {
      await addContribution(goalId, amount);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Metas Financeiras
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Defina e acompanhe seus objetivos
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="glow-primary w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Metas</p>
                <p className="text-lg font-bold text-foreground">{stats.totalGoals}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-lg font-bold text-accent">{stats.completedGoals}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Progresso Geral</p>
                <p className="text-lg font-bold text-foreground">{overallProgress.toFixed(1)}%</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Economizado</p>
                <p className="text-lg font-bold text-foreground">
                  R$ {(stats.totalCurrentAmount / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Goals Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="active" className="gap-2">
              <Target className="w-4 h-4" />
              Ativas ({stats.activeGoals})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Concluídas ({stats.completedGoals})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activeGoals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-foreground font-medium mb-2">Nenhuma meta ativa</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Crie sua primeira meta financeira para começar
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="glow-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Meta
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeGoals.map((goal, index) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={setDeletingGoal}
                    onAddContribution={setContributionGoal}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedGoals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-foreground font-medium mb-2">Nenhuma meta concluída</h3>
                <p className="text-muted-foreground text-sm">
                  Continue trabalhando nas suas metas ativas!
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedGoals.map((goal, index) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={setDeletingGoal}
                    onAddContribution={setContributionGoal}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        goal={editingGoal}
        isLoading={isSubmitting}
        categories={goalCategories}
      />

      <ContributionModal
        isOpen={!!contributionGoal}
        onClose={() => setContributionGoal(null)}
        onSubmit={handleContribution}
        goal={contributionGoal}
        isLoading={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={handleDelete}
        title="Excluir meta"
        description="Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita."
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Goals;
