import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FinancialSummary {
  health_score: number;
  health_status: 'excellent' | 'good' | 'attention' | 'critical';
  main_message: string;
}

export interface SpendingPattern {
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  category?: string;
}

export interface SavingsTip {
  title: string;
  description: string;
  potential_savings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
}

export interface MonthlyTrend {
  trend: 'improving' | 'stable' | 'declining';
  description: string;
}

export interface ActionItem {
  action: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
}

export interface FinancialInsights {
  summary: FinancialSummary;
  patterns: SpendingPattern[];
  savings_tips: SavingsTip[];
  monthly_trend: MonthlyTrend;
  action_items: ActionItem[];
}

export interface InsightsData {
  insights: FinancialInsights;
  rawData: {
    totalIncome: number;
    totalExpenses: number;
    expensesByCategory: Record<string, number>;
  };
}

export function useInsights() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('analyze-finances');

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (functionData?.error) {
        throw new Error(functionData.error);
      }

      setData(functionData as InsightsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter insights';
      setError(errorMessage);
      toast({
        title: 'Erro na análise',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    data,
    error,
    fetchInsights,
  };
}
