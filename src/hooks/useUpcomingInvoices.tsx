import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { projectUpcomingInvoices, projectUpcomingInvoicesByPerson, type MonthProjection, type ProjectionItem } from '@/lib/cards/projection';
import { addMonths, monthKey, toIsoDate } from '@/lib/dates';

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

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('invoice_items')
      .select('holder_name, description, amount, installment_current, installment_total, invoice:invoices!inner(card_id, period_end)');
    if (cardId) query = query.eq('invoice.card_id', cardId);

    const threeMonthsAgo = addMonths(toIsoDate(new Date()), -3);
    const [itemsRes, incomeRes] = await Promise.all([
      query,
      supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('date', threeMonthsAgo),
    ]);

    const items: ProjectionItem[] = (itemsRes.data ?? []).map((row) => {
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

    const proj = projectUpcomingInvoices(items, { months });
    setProjection(proj);
    setByPerson(projectUpcomingInvoicesByPerson(items, { months }));
    setCommittedNext3(round2(proj.slice(0, 3).reduce((s, m) => s + m.committed, 0)));
    const income = (incomeRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
    setAvgIncome3(round2(income / 3));
    setLoading(false);
  }, [user, cardId, months]);

  useEffect(() => { fetch(); }, [fetch]);

  return { projection, byPerson, committedNext3, avgIncome3, loading, refetch: fetch };
}
