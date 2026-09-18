import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataChanged } from '@/lib/dataEvents';
import { monthlyRecurringIncome, type ForecastRecurring } from '@/lib/recurring';
import { projectUpcomingInvoices, projectUpcomingInvoicesByPerson, type MonthProjection, type ProjectionItem } from '@/lib/cards/projection';
import { addMonths, monthKey, toIsoDate } from '@/lib/dates';
import { personShares, type Share } from '@/lib/cards/split';

export interface UpcomingInvoicesData {
  /** Projecao mes a mes (todos os cartoes, ou so o cartao pedido). */
  projection: MonthProjection[];
  /** A mesma projecao separada por pessoa, no mesmo eixo de meses. */
  byPerson: Record<string, MonthProjection[]>;
  /** Comprometido nos proximos 3 meses (soma). */
  committedNext3: number;
  /** Renda media mensal dos ultimos 3 meses (transacoes de receita). */
  avgIncome3: number;
  loading: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Projecao das proximas faturas a partir dos lancamentos importados. Sem
 * `cardId` considera todos os cartoes do usuario (Dashboard); com ele, so um.
 */
export function useUpcomingInvoices(cardId?: string, months = 6): UpcomingInvoicesData & { refetch: () => Promise<void> } {
  const { user } = useAuth();
  const [projection, setProjection] = useState<MonthProjection[]>([]);
  const [byPerson, setByPerson] = useState<Record<string, MonthProjection[]>>({});
  const [committedNext3, setCommittedNext3] = useState(0);
  const [avgIncome3, setAvgIncome3] = useState(0);
  const [loading, setLoading] = useState(true);
  // Primeira carga mostra o loading; as atualizacoes por evento sao silenciosas (sem piscar).
  const hasLoaded = useRef(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    if (!hasLoaded.current) setLoading(true);

    let query = supabase
      .from('invoice_items')
      .select('id, holder_name, assigned_to, description, amount, installment_current, installment_total, invoice:invoices!inner(card_id, period_end)');
    if (cardId) query = query.eq('invoice.card_id', cardId);

    const threeMonthsAgo = addMonths(toIsoDate(new Date()), -3);
    const [itemsRes, incomeRes, recurringRes] = await Promise.all([
      query,
      supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('date', threeMonthsAgo),
      supabase.from('recurring_transactions').select('id, description, amount, type, frequency, next_execution_date, day_of_month, end_date, installments_total, installments_done, is_active').eq('user_id', user.id).eq('is_active', true).eq('type', 'income'),
    ]);

    const rows = itemsRes.data ?? [];
    const splitsByItem = new Map<string, Share[]>();
    if (rows.length) {
      const { data: parts } = await supabase.from('invoice_item_splits').select('item_id, person, amount').in('item_id', rows.map((r) => r.id));
      for (const p of parts ?? []) splitsByItem.set(p.item_id, [...(splitsByItem.get(p.item_id) ?? []), { person: p.person, amount: Number(p.amount) }]);
    }
    // Compra dividida vira um item por parte (a parcela segue a fracao de cada pessoa).
    const items: ProjectionItem[] = rows.flatMap((row) => {
      const inv = row.invoice as unknown as { card_id: string; period_end: string };
      return personShares({ ...row, amount: Number(row.amount) }, splitsByItem.get(row.id) ?? []).map((sh) => ({
        cardId: inv.card_id,
        holder: sh.person,
        invoiceMonth: monthKey(inv.period_end),
        description: row.description,
        amount: sh.amount,
        installment_current: row.installment_current,
        installment_total: row.installment_total,
      }));
    });

    const proj = projectUpcomingInvoices(items, { months });
    setProjection(proj);
    setByPerson(projectUpcomingInvoicesByPerson(items, { months }));
    setCommittedNext3(round2(proj.slice(0, 3).reduce((s, m) => s + m.committed, 0)));
    const income = (incomeRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
    // Sem receita lancada nos ultimos 3 meses, a renda recorrente cadastrada (salario) serve de base.
    const recurringIncome = monthlyRecurringIncome((recurringRes.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }) as ForecastRecurring));
    setAvgIncome3(income > 0 ? round2(income / 3) : recurringIncome);
    setLoading(false);
    hasLoaded.current = true;
  }, [user, cardId, months]);

  useEffect(() => { fetch(); }, [fetch]);
  useDataChanged(fetch, ['cards', 'people', 'recurring', 'transactions']);

  return { projection, byPerson, committedNext3, avgIncome3, loading, refetch: fetch };
}
