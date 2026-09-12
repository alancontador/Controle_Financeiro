import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { computeReceivables, type Charge, type Payment, type Receivable } from '@/lib/receivables';
import { loadThirdPartySet } from '@/hooks/usePeople';

export interface ChargeRow extends Charge {
  id: string;
  card_last_four: string | null;
  card_holder: string;
  /** Parte de uma compra dividida. */
  split: boolean;
}

export interface PaymentRow extends Payment {
  id: string;
  notes: string | null;
}

/**
 * Quanto cada terceiro deve: compras atribuidas a ele (realocadas ou partes
 * de divisao) nos cartoes do usuario, menos pagamentos registrados.
 */
export function useReceivables() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const third = await loadThirdPartySet(user.id);
    const names = [...third];

    const [reassignedRes, splitsRes, paymentsRes] = await Promise.all([
      names.length
        ? supabase.from('invoice_items').select('id, description, amount, transaction_date, card_last_four, holder_name, assigned_to').in('assigned_to', names)
        : Promise.resolve({ data: [] as never[] }),
      names.length
        ? supabase.from('invoice_item_splits').select('id, person, amount, item:invoice_items(id, description, transaction_date, card_last_four, holder_name)').in('person', names)
        : Promise.resolve({ data: [] as never[] }),
      supabase.from('person_payments').select('id, person, amount, date, notes').eq('user_id', user.id).order('date', { ascending: false }),
    ]);

    const chargeRows: ChargeRow[] = [
      ...((reassignedRes.data ?? []) as { id: string; description: string; amount: number; transaction_date: string; card_last_four: string | null; holder_name: string; assigned_to: string }[]).map((r) => ({
        id: r.id, person: r.assigned_to, amount: Number(r.amount), date: r.transaction_date, description: r.description,
        card_last_four: r.card_last_four, card_holder: r.holder_name, split: false,
      })),
      ...((splitsRes.data ?? []) as { id: string; person: string; amount: number; item: { id: string; description: string; transaction_date: string; card_last_four: string | null; holder_name: string } | null }[])
        .filter((r) => r.item)
        .map((r) => ({
          id: r.id, person: r.person, amount: Number(r.amount), date: r.item!.transaction_date, description: r.item!.description,
          card_last_four: r.item!.card_last_four, card_holder: r.item!.holder_name, split: true,
        })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const paymentRows: PaymentRow[] = (paymentsRes.data ?? []).map((p) => ({ id: p.id, person: p.person, amount: Number(p.amount), date: p.date, notes: p.notes }));

    setCharges(chargeRows);
    setPayments(paymentRows);
    setReceivables(computeReceivables(chargeRows, paymentRows, names));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addPayment = async (person: string, amount: number, date: string, notes?: string) => {
    if (!user) return false;
    const { error } = await supabase.from('person_payments').insert({ user_id: user.id, person, amount, date, notes: notes?.trim() || null });
    if (error) {
      toast({ title: 'Erro ao registrar pagamento', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Pagamento registrado' });
    await fetch();
    return true;
  };

  const deletePayment = async (id: string) => {
    const { error } = await supabase.from('person_payments').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir pagamento', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetch();
    return true;
  };

  return { receivables, charges, payments, loading, refetch: fetch, addPayment, deletePayment };
}
