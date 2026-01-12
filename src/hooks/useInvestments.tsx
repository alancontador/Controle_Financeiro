import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface InvestmentClass {
  id: string;
  user_id: string;
  name: string;
  target_allocation: number;
  color: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  class_id: string | null;
  ticker: string;
  name: string;
  type: 'stock_br' | 'stock_us' | 'fixed_income' | 'reits' | 'crypto' | 'etf_br' | 'etf_us';
  quantity: number;
  average_price: number;
  current_price: number;
  currency: 'BRL' | 'USD';
  notes: string | null;
  created_at: string;
  updated_at: string;
  investment_class?: InvestmentClass;
}

export interface RetirementSimulation {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
  inflationRate: number;
}

export interface ProjectionPoint {
  age: number;
  year: number;
  value: number;
  contributions: number;
}

export interface AssetComparison {
  name: string;
  year1: number;
  year5: number;
  year10: number;
  color: string;
}

const assetComparisons: AssetComparison[] = [
  { name: 'CDI', year1: 12.5, year5: 72.3, year10: 175.8, color: 'hsl(160 100% 39%)' },
  { name: 'Ibovespa', year1: 8.2, year5: 48.6, year10: 125.4, color: 'hsl(255 75% 64%)' },
  { name: 'S&P 500', year1: 15.8, year5: 98.5, year10: 245.2, color: 'hsl(200 100% 50%)' },
  { name: 'Bitcoin', year1: 85.2, year5: 520.3, year10: 1850.5, color: 'hsl(35 100% 50%)' },
];

const investmentTypeLabels: Record<Investment['type'], string> = {
  stock_br: 'Ações BR',
  stock_us: 'Ações EUA',
  fixed_income: 'Renda Fixa',
  reits: 'FIIs',
  crypto: 'Cripto',
  etf_br: 'ETF BR',
  etf_us: 'ETF EUA',
};

export function useInvestments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [simulation, setSimulation] = useState<RetirementSimulation>({
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 0,
    monthlyContribution: 1000,
    expectedReturn: 10,
    inflationRate: 4.5,
  });

  // Fetch investment classes
  const { data: investmentClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['investment-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('investment_classes')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data as InvestmentClass[];
    },
    enabled: !!user?.id,
  });

  // Fetch investments
  const { data: investments = [], isLoading: loadingInvestments } = useQuery({
    queryKey: ['investments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('investments')
        .select('*, investment_class:investment_classes(*)')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data as Investment[];
    },
    enabled: !!user?.id,
  });

  // Create investment class
  const createClassMutation = useMutation({
    mutationFn: async (data: Omit<InvestmentClass, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data: result, error } = await supabase
        .from('investment_classes')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-classes'] });
      toast.success('Classe de ativo criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar classe de ativo: ' + error.message);
    },
  });

  // Update investment class
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<InvestmentClass> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('investment_classes')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-classes'] });
      toast.success('Classe de ativo atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar classe de ativo: ' + error.message);
    },
  });

  // Delete investment class
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investment_classes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-classes'] });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Classe de ativo excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir classe de ativo: ' + error.message);
    },
  });

  // Create investment
  const createInvestmentMutation = useMutation({
    mutationFn: async (data: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'investment_class'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data: result, error } = await supabase
        .from('investments')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Ativo adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar ativo: ' + error.message);
    },
  });

  // Update investment
  const updateInvestmentMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Investment> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('investments')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Ativo atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar ativo: ' + error.message);
    },
  });

  // Delete investment
  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Ativo removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover ativo: ' + error.message);
    },
  });

  // Fetch quotes from Yahoo Finance
  const [isUpdatingQuotes, setIsUpdatingQuotes] = useState(false);
  
  const updateQuotes = async () => {
    if (investments.length === 0) {
      toast.info('Nenhum ativo para atualizar');
      return;
    }

    // Filter only types that can be quoted (not fixed income)
    const quotableInvestments = investments.filter(inv => inv.type !== 'fixed_income');
    
    if (quotableInvestments.length === 0) {
      toast.info('Nenhum ativo com cotação disponível');
      return;
    }

    setIsUpdatingQuotes(true);
    
    try {
      const tickers = quotableInvestments.map(inv => ({
        ticker: inv.ticker,
        type: inv.type,
      }));

      const { data, error } = await supabase.functions.invoke('fetch-quotes', {
        body: { tickers },
      });

      if (error) throw error;

      const quotes = data?.quotes || [];
      let updatedCount = 0;
      let errorCount = 0;

      // Update each investment with the new price
      for (const quote of quotes) {
        if (quote.price !== null) {
          const investment = quotableInvestments.find(inv => 
            inv.ticker.toUpperCase() === quote.ticker.toUpperCase()
          );
          
          if (investment) {
            const { error: updateError } = await supabase
              .from('investments')
              .update({ current_price: quote.price })
              .eq('id', investment.id);
            
            if (updateError) {
              console.error(`Error updating ${quote.ticker}:`, updateError);
              errorCount++;
            } else {
              updatedCount++;
            }
          }
        } else if (quote.error) {
          console.warn(`Quote error for ${quote.ticker}: ${quote.error}`);
          errorCount++;
        }
      }

      // Invalidate to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['investments'] });

      if (updatedCount > 0) {
        toast.success(`${updatedCount} cotação(ões) atualizada(s)${errorCount > 0 ? ` (${errorCount} erro(s))` : ''}`);
      } else if (errorCount > 0) {
        toast.error(`Não foi possível atualizar as cotações (${errorCount} erro(s))`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error updating quotes:', errorMessage);
      toast.error('Erro ao atualizar cotações: ' + errorMessage);
    } finally {
      setIsUpdatingQuotes(false);
    }
  };

  // Calculate totals
  const totalValue = useMemo(() => {
    return investments.reduce((acc, inv) => {
      const value = inv.quantity * inv.current_price;
      // Convert USD to BRL (simplified - ideally would use real exchange rate)
      return acc + (inv.currency === 'USD' ? value * 5.0 : value);
    }, 0);
  }, [investments]);

  // Calculate allocation by class
  const allocationByClass = useMemo(() => {
    const allocations: Record<string, { name: string; value: number; color: string; target: number }> = {};
    
    investmentClasses.forEach(cls => {
      allocations[cls.id] = {
        name: cls.name,
        value: 0,
        color: cls.color,
        target: cls.target_allocation,
      };
    });

    investments.forEach(inv => {
      if (inv.class_id && allocations[inv.class_id]) {
        const value = inv.quantity * inv.current_price;
        const valueBRL = inv.currency === 'USD' ? value * 5.0 : value;
        allocations[inv.class_id].value += valueBRL;
      }
    });

    return Object.entries(allocations).map(([id, data]) => ({
      id,
      ...data,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }));
  }, [investments, investmentClasses, totalValue]);

  // Calculate average monthly return (simplified estimation)
  const averageMonthlyReturn = useMemo(() => {
    if (investments.length === 0) return 0;
    
    let totalGain = 0;
    let totalInvested = 0;

    investments.forEach(inv => {
      const invested = inv.quantity * inv.average_price;
      const current = inv.quantity * inv.current_price;
      totalInvested += invested;
      totalGain += current - invested;
    });

    if (totalInvested === 0) return 0;
    
    // Assume 12-month period for simplicity
    const totalReturn = (totalGain / totalInvested) * 100;
    return totalReturn / 12;
  }, [investments]);

  // Update simulation with current total value
  const effectiveSimulation = useMemo(() => ({
    ...simulation,
    currentSavings: totalValue || simulation.currentSavings,
  }), [simulation, totalValue]);

  // Projections calculation
  const projections = useMemo((): ProjectionPoint[] => {
    const { currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn, inflationRate } = effectiveSimulation;
    const years = retirementAge - currentAge;
    const realReturn = (expectedReturn - inflationRate) / 100;
    const monthlyRealReturn = Math.pow(1 + realReturn, 1/12) - 1;
    
    const points: ProjectionPoint[] = [];
    let value = currentSavings;
    let totalContributions = currentSavings;
    const currentYear = new Date().getFullYear();

    for (let i = 0; i <= years; i++) {
      points.push({
        age: currentAge + i,
        year: currentYear + i,
        value: Math.round(value),
        contributions: Math.round(totalContributions),
      });
      
      for (let month = 0; month < 12; month++) {
        value = value * (1 + monthlyRealReturn) + monthlyContribution;
        totalContributions += monthlyContribution;
      }
    }

    return points;
  }, [effectiveSimulation]);

  const retirementIncome = useMemo(() => {
    const finalValue = projections[projections.length - 1]?.value || 0;
    const annualIncome = finalValue * 0.04;
    return Math.round(annualIncome / 12);
  }, [projections]);

  const updateSimulation = (updates: Partial<RetirementSimulation>) => {
    setSimulation(prev => ({ ...prev, ...updates }));
  };

  // Legacy assets format for backward compatibility
  const assets = useMemo(() => {
    return allocationByClass.map((cls, index) => ({
      id: cls.id,
      name: cls.name,
      type: 'stocks' as const,
      allocation: cls.percentage,
      currentValue: cls.value,
      monthlyReturn: averageMonthlyReturn,
      color: cls.color,
    }));
  }, [allocationByClass, averageMonthlyReturn]);

  return {
    // Investment classes
    investmentClasses,
    loadingClasses,
    createClass: createClassMutation.mutate,
    updateClass: updateClassMutation.mutate,
    deleteClass: deleteClassMutation.mutate,
    
    // Investments
    investments,
    loadingInvestments,
    createInvestment: createInvestmentMutation.mutate,
    updateInvestment: updateInvestmentMutation.mutate,
    deleteInvestment: deleteInvestmentMutation.mutate,
    
    // Quotes
    updateQuotes,
    isUpdatingQuotes,
    
    // Calculations
    totalValue,
    allocationByClass,
    averageMonthlyReturn,
    
    // Simulation
    simulation: effectiveSimulation,
    updateSimulation,
    projections,
    retirementIncome,
    
    // Legacy
    assets,
    assetComparisons,
    investmentTypeLabels,
    
    // Loading states
    isLoading: loadingClasses || loadingInvestments,
  };
}