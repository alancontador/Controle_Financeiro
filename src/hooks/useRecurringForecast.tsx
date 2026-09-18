import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataChanged } from '@/lib/dataEvents';
import { toIsoDate } from '@/lib/dates';
import { forecastForMonth, monthlyRecurringIncome, type ForecastRecurring, type MonthForecast } from '@/lib/recurring';

/**
 * Previsao das recorrencias (salario, contas fixas) para um mes: o que ainda
 * vai cair. Complementa os numeros realizados do dashboard, para o mes nao
 * parecer "sem receita" so porque o salario e dia 28.
 */
export function useRecurringForecast(month: string): MonthForecast & { monthlyIncome: number; loading: boolean } {
  const { user } = useAuth();
  const [rows, setRows] = useState<ForecastRecurring[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recurring_transactions')
      .select('id, description, amount, type, frequency, next_execution_date, day_of_month, end_date, installments_total, installments_done, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);
    setRows((data ?? []).map((r) => ({ ...r, amount: Number(r.amount), type: r.type as 'income' | 'expense', frequency: r.frequency as ForecastRecurring['frequency'] })));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  useDataChanged(fetch, ['recurring', 'transactions']);

  const forecast = useMemo(() => forecastForMonth(rows, month, toIsoDate(new Date())), [rows, month]);
  const monthlyIncome = useMemo(() => monthlyRecurringIncome(rows), [rows]);
  return { ...forecast, monthlyIncome, loading };
}
