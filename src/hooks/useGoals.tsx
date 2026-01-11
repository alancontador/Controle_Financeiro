import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Tables } from '@/integrations/supabase/types';

export type Goal = Tables<'goals'>;

export interface GoalFormData {
  name: string;
  description?: string | null;
  target_amount: number;
  current_amount: number;
  deadline?: string | null;
  category: string;
  icon: string;
  color: string;
}

const goalCategories = [
  { value: 'savings', label: 'Poupança', icon: 'PiggyBank', color: '#6B46FF' },
  { value: 'travel', label: 'Viagem', icon: 'Plane', color: '#00C896' },
  { value: 'car', label: 'Veículo', icon: 'Car', color: '#FF9500' },
  { value: 'home', label: 'Imóvel', icon: 'Home', color: '#0080FF' },
  { value: 'education', label: 'Educação', icon: 'GraduationCap', color: '#FF5757' },
  { value: 'emergency', label: 'Reserva de Emergência', icon: 'Shield', color: '#00C896' },
  { value: 'retirement', label: 'Aposentadoria', icon: 'Wallet', color: '#6B46FF' },
  { value: 'other', label: 'Outro', icon: 'Target', color: '#6B46FF' },
];

export function useGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      console.error('Error fetching goals:', error);
      toast({
        title: 'Erro ao carregar metas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user, fetchGoals]);

  const addGoal = async (data: GoalFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        name: data.name,
        description: data.description,
        target_amount: data.target_amount,
        current_amount: data.current_amount,
        deadline: data.deadline,
        category: data.category,
        icon: data.icon,
        color: data.color,
      });

      if (error) throw error;

      toast({
        title: 'Meta criada!',
        description: 'Sua nova meta foi adicionada com sucesso.',
      });

      await fetchGoals();
    } catch (error: any) {
      console.error('Error adding goal:', error);
      toast({
        title: 'Erro ao criar meta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateGoal = async (id: string, data: Partial<GoalFormData>) => {
    if (!user) return;

    try {
      // Check if goal is being completed
      const goal = goals.find(g => g.id === id);
      const isCompleting = data.current_amount !== undefined && 
                           goal && 
                           data.current_amount >= Number(goal.target_amount) && 
                           !goal.is_completed;

      const updateData: any = { ...data };
      
      if (isCompleting) {
        updateData.is_completed = true;
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      if (isCompleting) {
        toast({
          title: '🎉 Parabéns!',
          description: `Você alcançou sua meta "${goal?.name}"!`,
        });
      } else {
        toast({
          title: 'Meta atualizada!',
          description: 'Sua meta foi atualizada com sucesso.',
        });
      }

      await fetchGoals();
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast({
        title: 'Erro ao atualizar meta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Meta excluída',
        description: 'A meta foi removida com sucesso.',
      });

      await fetchGoals();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Erro ao excluir meta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addContribution = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newAmount = Number(goal.current_amount) + amount;
    await updateGoal(goalId, { current_amount: newAmount });
  };

  // Calculate statistics
  const stats = {
    totalGoals: goals.length,
    completedGoals: goals.filter(g => g.is_completed).length,
    activeGoals: goals.filter(g => !g.is_completed).length,
    totalTargetAmount: goals.reduce((acc, g) => acc + Number(g.target_amount), 0),
    totalCurrentAmount: goals.reduce((acc, g) => acc + Number(g.current_amount), 0),
  };

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    stats,
    goalCategories,
  };
}
