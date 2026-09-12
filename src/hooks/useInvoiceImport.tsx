import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { invoicePeriodFromClosing } from '@/lib/cards/period';
import { itemToTransaction } from '@/lib/cards/mirror';
import {
  DEFAULT_CATEGORY_STYLE, FALLBACK_CATEGORY, RULE_CATEGORIES, normalizeDescription, suggestCategory,
  type CategoryMemory,
} from '@/lib/pdf/categorize';
import type { BradescoHeader, BradescoItem } from '@/lib/pdf/bradesco';
import type { CreditCard, Invoice } from '@/hooks/useCreditCards';

export interface ImportableItem extends BradescoItem {
  is_previous_balance: boolean;
}

/** O que a revisao precisa para categorizar: opcoes, sugestao e o mapa nome -> id. */
export interface Categorization {
  options: string[];
  suggest: (description: string) => string;
  idByName: Map<string, string>;
}

export interface ImportInput {
  cardId: string;
  header: BradescoHeader;
  items: ImportableItem[];
  previousBalance: number;
  /** Data de fechamento da fatura (define o periodo). */
  closingDate: string;
  categorization: Categorization;
}

export type ImportOutcome =
  | { status: 'ok'; invoiceId: string }
  | { status: 'duplicate'; invoice: Invoice }
  | { status: 'error' };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Orquestra a importacao de uma fatura lida do PDF: categorias (memoria +
 * regras), titulares, fatura do periodo, lancamentos e as despesas espelhadas
 * em `transactions`.
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

  /**
   * Monta a categorizacao: memoria do que o usuario ja categorizou (faturas e
   * transacoes), garante que as categorias-alvo das regras existam no cadastro
   * e devolve a funcao de sugestao.
   */
  const loadCategorization = useCallback(async (): Promise<Categorization> => {
    if (!user) return { options: [FALLBACK_CATEGORY], suggest: () => FALLBACK_CATEGORY, idByName: new Map() };

    const [catsRes, itemsRes, txRes] = await Promise.all([
      supabase.from('categories').select('id, name, type').eq('user_id', user.id).eq('type', 'expense'),
      // RLS ja restringe aos cartoes do usuario. Mais recentes primeiro: a ultima correcao vence.
      supabase.from('invoice_items').select('description, category').neq('category', FALLBACK_CATEGORY)
        .order('created_at', { ascending: false }).limit(2000),
      supabase.from('transactions').select('description, category:categories(name)').eq('user_id', user.id)
        .eq('type', 'expense').not('category_id', 'is', null).order('created_at', { ascending: false }).limit(2000),
    ]);

    const idByName = new Map<string, string>((catsRes.data ?? []).map((c) => [c.name, c.id]));

    // Categorias-alvo que faltam: cria com icone/cor padrao.
    const missing = RULE_CATEGORIES.filter((name) => !idByName.has(name));
    if (missing.length > 0) {
      const { data: created } = await supabase
        .from('categories')
        .insert(missing.map((name) => ({ user_id: user.id, name, type: 'expense', ...DEFAULT_CATEGORY_STYLE[name] })))
        .select('id, name');
      for (const c of created ?? []) idByName.set(c.name, c.id);
    }

    const memory = new Map<string, string>();
    const remember = (description: string, category: string | undefined) => {
      if (!category || !idByName.has(category)) return;
      const key = normalizeDescription(description);
      if (key && !memory.has(key)) memory.set(key, category);
    };
    // Transacoes primeiro: e onde o usuario edita categoria no dia a dia.
    for (const t of txRes.data ?? []) {
      const cat = t.category as unknown as { name: string } | null;
      remember(t.description, cat?.name);
    }
    for (const i of itemsRes.data ?? []) remember(i.description, i.category);

    const options = [...idByName.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const mem: CategoryMemory = memory;
    return { options, suggest: (d) => suggestCategory(d, mem).category, idByName };
  }, [user]);

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

  /**
   * Grava os lancamentos de uma fatura (com category_id) e espelha cada compra
   * como despesa em `transactions`. Usado tanto pelo fluxo da aba Cartoes
   * quanto pela importacao dentro de uma fatura ja aberta.
   */
  const writeItems = useCallback(
    async (invoiceId: string, items: ImportableItem[], categorization: Categorization): Promise<boolean> => {
      if (!user) return false;
      const rows = items.map((item) => ({
        invoice_id: invoiceId,
        ...item,
        category_id: categorization.idByName.get(item.category) ?? null,
      }));
      const { data: inserted, error } = await supabase
        .from('invoice_items')
        .insert(rows)
        .select('id, description, amount, transaction_date, category_id');
      if (error) {
        toast({ title: 'Erro ao gravar os lançamentos', description: error.message, variant: 'destructive' });
        return false;
      }

      const mirrored = (inserted ?? [])
        .map((row) => itemToTransaction(row, user.id))
        .filter((t): t is NonNullable<typeof t> => t !== null);
      if (mirrored.length > 0) {
        const { error: txError } = await supabase.from('transactions').insert(mirrored);
        if (txError) {
          toast({
            title: 'Lançamentos gravados, mas não refletidos nas transações',
            description: txError.message,
            variant: 'destructive',
          });
        }
      }
      return true;
    },
    [user, toast],
  );

  const importInvoice = useCallback(
    async (input: ImportInput, options: { replace?: boolean } = {}): Promise<ImportOutcome> => {
      if (!user) return { status: 'error' };

      const existing = await findExistingInvoice(input.cardId, input.closingDate);
      if (existing && !options.replace) return { status: 'duplicate', invoice: existing };

      await ensureHolders(input.cardId, input.header.holders);

      let invoiceId: string;
      if (existing) {
        // Substituir: apaga os lancamentos antigos; as transacoes espelhadas caem por CASCADE.
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

      const ok = await writeItems(invoiceId, input.items, input.categorization);
      if (!ok) return { status: 'error' };

      const total = input.items.reduce((s, i) => s + i.amount, 0) + input.previousBalance;
      await supabase
        .from('invoices')
        .update({ previous_balance: input.previousBalance, total_amount: round2(total) })
        .eq('id', invoiceId);

      toast({ title: existing ? 'Fatura substituída' : 'Fatura importada', description: `${input.items.length} lançamentos` });
      return { status: 'ok', invoiceId };
    },
    [user, findExistingInvoice, ensureHolders, writeItems, toast],
  );

  return { findCardByLastFour, findExistingInvoice, loadCategorization, writeItems, importInvoice };
}
