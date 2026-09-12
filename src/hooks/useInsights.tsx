import { useState, useCallback } from 'react';
import { projectUpcomingInvoices, projectUpcomingInvoicesByPerson, type MonthProjection, type ProjectionItem } from '@/lib/cards/projection';
import { monthKey } from '@/lib/dates';
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

export interface PersonInsight {
  person: string;
  status: 'excellent' | 'good' | 'attention' | 'critical';
  main_message: string;
  top_issue: string;
  suggestion: string;
  potential_savings: number;
}

export interface FinancialInsights {
  summary: FinancialSummary;
  /** Diagnostico por pessoa: onde esta o gargalo e o que cada uma precisa ajustar. */
  by_person?: PersonInsight[];
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

/** Mesma projecao dos cartoes (todos), 6 meses, no formato que a funcao espera. */
async function loadProjection(): Promise<{ projection: MonthProjection[]; projectionByPerson: Record<string, MonthProjection[]> }> {
  const { data } = await supabase
    .from('invoice_items')
    .select('holder_name, description, amount, installment_current, installment_total, invoice:invoices!inner(card_id, period_end)');
  const items: ProjectionItem[] = (data ?? []).map((row) => {
    const inv = row.invoice as unknown as { card_id: string; period_end: string };
    return {
      cardId: inv.card_id,
      holder: row.holder_name,
      invoiceMonth: monthKey(inv.period_end),
      description: row.description,
      amount: Number(row.amount),
      installment_current: row.installment_current,
      installment_total: row.installment_total,
    };
  });
  return {
    projection: projectUpcomingInvoices(items, { months: 6 }),
    projectionByPerson: projectUpcomingInvoicesByPerson(items, { months: 6 }),
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
      // Projecao das proximas faturas entra no contexto: a analise de saude
      // precisa saber o que ja esta comprometido, nao so o que foi gasto.
      const { data: functionData, error: functionError } = await supabase.functions.invoke('analyze-finances', {
        body: await loadProjection(),
      });

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
