import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { addMonths, monthKey, toIsoDate } from '@/lib/dates';
import { summarizeByPerson, type PersonSummary, type PersonTx } from '@/lib/people';

export interface SpendingByPersonData {
  /** Mes analisado (aaaa-mm): o atual, ou o ultimo com despesas se o atual estiver vazio. */
  month: string;
  /** true quando `month` nao e o mes corrente (caiu no ultimo mes com dados). */
  isFallback: boolean;
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
  const [month, setMonth] = useState(monthKey(toIsoDate(new Date())));

  const currentMonth = monthKey(toIsoDate(new Date()));

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const from = addMonths(`${currentMonth}-01`, -(monthsBack - 1));
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

    // Mes corrente sem despesas (ex.: fatura do mes ainda nao importada): usa o ultimo com dados.
    const withData = [...new Set(txs.map((t) => t.date.slice(0, 7)))].sort();
    const chosen = withData.includes(currentMonth) ? currentMonth : (withData.at(-1) ?? currentMonth);
    setMonth(chosen);
    setSummary(summarizeByPerson(txs, chosen, { previousMonth: monthKey(addMonths(`${chosen}-01`, -1)) }));

    const axis = Array.from({ length: monthsBack }, (_, k) => monthKey(addMonths(`${currentMonth}-01`, -(monthsBack - 1 - k))));
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
  }, [user, currentMonth, monthsBack]);

  useEffect(() => { fetch(); }, [fetch]);

  return { month, isFallback: month !== currentMonth, summary, history, months, loading, refetch: fetch };
}
