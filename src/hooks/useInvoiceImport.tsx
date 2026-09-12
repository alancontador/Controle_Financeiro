import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { invoicePeriodFromClosing } from '@/lib/cards/period';
import type { BradescoHeader, BradescoItem } from '@/lib/pdf/bradesco';
import type { CreditCard, Invoice } from '@/hooks/useCreditCards';

export interface ImportableItem extends BradescoItem {
  is_previous_balance: boolean;
}

export interface ImportInput {
  cardId: string;
  header: BradescoHeader;
  items: ImportableItem[];
  previousBalance: number;
  /** Data de fechamento da fatura (define o periodo). */
  closingDate: string;
}

export type ImportOutcome =
  | { status: 'ok'; invoiceId: string }
  | { status: 'duplicate'; invoice: Invoice }
  | { status: 'error' };

/**
 * Orquestra a importacao de uma fatura lida do PDF: garante os titulares,
 * acha ou cria a fatura do periodo, grava os lancamentos e recalcula o total.
 *
 * Nao cria o cartao: quem chama decide (usa um existente ou abre o cadastro
 * pre-preenchido) e passa o id.
 */
export function useInvoiceImport() {
  const { user } = useAuth();
  const { toast } = useToast();

  const findCardByLastFour = useCallback(
    (cards: CreditCard[], lastFour?: string) =>
      lastFour ? cards.find((c) => c.last_four_digits === lastFour) ?? null : null,
    [],
  );

  /** Fatura ja importada para este cartao com este fechamento, se houver. */
  const findExistingInvoice = useCallback(async (cardId: string, closingDate: string): Promise<Invoice | null> => {
    const { period_end } = invoicePeriodFromClosing(closingDate);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('card_id', cardId)
      .eq('period_end', period_end)
      .maybeSingle();
    return (data as Invoice) ?? null;
  }, []);

  const ensureHolders = useCallback(async (cardId: string, names: string[]) => {
    if (names.length === 0) return;
    const { data: existing } = await supabase.from('card_holders').select('holder_name, is_primary').eq('card_id', cardId);
    const have = new Set((existing ?? []).map((h) => h.holder_name.trim().toUpperCase()));
    const hasPrimary = (existing ?? []).some((h) => h.is_primary);
    const rows = names
      .filter((n) => !have.has(n.trim().toUpperCase()))
      .map((n, i) => ({ card_id: cardId, holder_name: n, is_primary: !hasPrimary && i === 0 }));
    if (rows.length > 0) await supabase.from('card_holders').insert(rows);
  }, []);

  const importInvoice = useCallback(
    async (input: ImportInput, options: { replace?: boolean } = {}): Promise<ImportOutcome> => {
      if (!user) return { status: 'error' };

      const existing = await findExistingInvoice(input.cardId, input.closingDate);
      if (existing && !options.replace) return { status: 'duplicate', invoice: existing };

      await ensureHolders(input.cardId, input.header.holders);

      let invoiceId: string;
      if (existing) {
        // Substituir: apaga os lancamentos antigos (as transacoes espelhadas caem por CASCADE).
        const { error } = await supabase.from('invoice_items').delete().eq('invoice_id', existing.id);
        if (error) {
          toast({ title: 'Erro ao substituir a fatura', description: error.message, variant: 'destructive' });
          return { status: 'error' };
        }
        invoiceId = existing.id;
      } else {
        const period = invoicePeriodFromClosing(input.closingDate);
        const { data, error } = await supabase
          .from('invoices')
          .insert({ card_id: input.cardId, ...period, status: 'OPEN', total_amount: 0, previous_balance: 0 })
          .select('id')
          .single();
        if (error || !data) {
          toast({ title: 'Erro ao criar a fatura', description: error?.message, variant: 'destructive' });
          return { status: 'error' };
        }
        invoiceId = data.id;
      }

      const rows = input.items.map((item) => ({ invoice_id: invoiceId, ...item }));
      const { error: itemsError } = await supabase.from('invoice_items').insert(rows);
      if (itemsError) {
        toast({ title: 'Erro ao gravar os lançamentos', description: itemsError.message, variant: 'destructive' });
        return { status: 'error' };
      }

      const total = input.items.reduce((s, i) => s + i.amount, 0) + input.previousBalance;
      await supabase
        .from('invoices')
        .update({ previous_balance: input.previousBalance, total_amount: Math.round(total * 100) / 100 })
        .eq('id', invoiceId);

      toast({ title: existing ? 'Fatura substituída' : 'Fatura importada', description: `${input.items.length} lançamentos` });
      return { status: 'ok', invoiceId };
    },
    [user, findExistingInvoice, ensureHolders, toast],
  );

  return { findCardByLastFour, findExistingInvoice, importInvoice };
}
