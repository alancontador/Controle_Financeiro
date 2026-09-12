import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { addMonths, monthKey, toIsoDate } from '@/lib/dates';
import { summarizeByPerson, type PersonSummary, type PersonTx } from '@/lib/people';

export interface SpendingByPersonData {
  /** Mes analisado (aaaa-mm). */
  month: string;
  summary: PersonSummary[];
  /** Series mensais por pessoa para os ultimos N meses: pessoa -> [{month,total}]. */
  history: Record<string, { month: string; total: number }[]>;
  months: string[];
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Gastos por pessoa: resumo do mes (com comparacao ao anterior e top categorias)
 * e historico mensal dos ultimos `monthsBack` meses.
 */
export function useSpendingByPerson(monthsBack = 6): SpendingByPersonData {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PersonSummary[]>([]);
  const [history, setHistory] = useState<Record<string, { month: string; total: number }[]>>({});
  const [months, setMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const today = toIsoDate(new Date());
  const month = monthKey(today);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const from = addMonths(`${month}-01`, -(monthsBack - 1));
    const { data } = await supabase
      .from('transactions')
      .select('holder_name, amount, type, date, category:categories(name)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', from);

    const txs: PersonTx[] = (data ?? []).map((t) => ({
      holder_name: t.holder_name,
      amount: Number(t.amount),
      type: 'expense',
      date: t.date,
      category_name: (t.category as unknown as { name: string } | null)?.name ?? null,
    }));

    setSummary(summarizeByPerson(txs, month, { previousMonth: monthKey(addMonths(`${month}-01`, -1)) }));

    const axis = Array.from({ length: monthsBack }, (_, k) => monthKey(addMonths(`${month}-01`, -(monthsBack - 1 - k))));
    const hist: Record<string, { month: string; total: number }[]> = {};
    for (const m of axis) {
      for (const p of summarizeByPerson(txs, m)) {
        hist[p.person] = hist[p.person] ?? axis.map((mm) => ({ month: mm, total: 0 }));
        hist[p.person][axis.indexOf(m)].total = p.total;
      }
    }
    setMonths(axis);
    setHistory(hist);
    setLoading(false);
  }, [user, month, monthsBack]);

  useEffect(() => { fetch(); }, [fetch]);

  return { month, summary, history, months, loading, refetch: fetch };
}
