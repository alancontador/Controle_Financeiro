import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { notifyDataChanged, useDataChanged } from '@/lib/dataEvents';
import { useToast } from '@/hooks/use-toast';
import { computeCardUsage, type CardUsage } from '@/lib/cards/usage';
import { itemToTransaction, MIRROR_NOTE } from '@/lib/cards/mirror';
import { loadThirdPartySet } from '@/hooks/usePeople';
import type { Share } from '@/lib/cards/split';
import { attributionKeys, fractionsFromShares } from '@/lib/cards/attribution';
import type { Json } from '@/integrations/supabase/types';

/** Grava (ou apaga, com null) a decisao de atribuicao de uma compra nos dois niveis: compra exata e descricao no cartao. */
async function rememberAttribution(
  item: { holder_name: string; card_last_four: string | null; transaction_date: string; description: string; amount: number; installment_total: number | null },
  value: { assigned_to?: string | null; shares?: Share[] } | null,
) {
  if (!item.card_last_four) return;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const keys = attributionKeys({ ...item, amount: Number(item.amount) });
  const list = [keys.purchase, keys.description];
  if (!value) {
    await supabase.from('attribution_memory').delete().eq('user_id', userId).in('key', list);
    return;
  }
  const shares = value.shares && value.shares.length >= 2 ? fractionsFromShares(Number(item.amount), value.shares) : null;
  await supabase.from('attribution_memory').upsert(
    list.map((key) => ({
      user_id: userId,
      key,
      assigned_to: shares ? null : value.assigned_to ?? null,
      shares: shares ? (JSON.parse(JSON.stringify(shares)) as Json) : null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'user_id,key' },
  );
}

export interface CreditCard {
  id: string;
  user_id: string;
  nickname: string;
  brand: string;
  issuer_bank: string;
  last_four_digits: string;
  total_limit: number;
  closing_day: number;
  due_day: number;
  created_at: string;
}

export interface CardHolder {
  id: string;
  card_id: string;
  holder_name: string;
  is_primary: boolean;
  /** Final do numero deste cartao (principal, virtual ou adicional). Null em cadastros antigos. */
  last_four: string | null;
  kind: 'principal' | 'adicional' | 'virtual' | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  card_id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_amount: number;
  previous_balance: number;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  holder_name: string;
  /** Responsavel pela despesa quando realocada para outra pessoa; null = titular do cartao. */
  assigned_to: string | null;
  card_last_four: string | null;
  card_kind: 'principal' | 'adicional' | 'virtual' | null;
  category_id: string | null;
  transaction_date: string;
  description: string;
  amount: number;
  category: string;
  installment_current: number | null;
  installment_total: number | null;
  is_previous_balance: boolean;
  created_at: string;
}

export function useCreditCards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  // Primeira carga mostra o loading; as atualizacoes por evento sao silenciosas (sem piscar).
  const hasLoaded = useRef(false);
  const [openInvoiceTotals, setOpenInvoiceTotals] = useState<Record<string, number>>({});
  /** Uso do limite por cartao: faturas nao pagas + parcelas futuras (como o banco calcula). */
  const [usage, setUsage] = useState<Record<string, CardUsage>>({});

  const fetchCards = useCallback(async () => {
    if (!user) return;
    if (!hasLoaded.current) setLoading(true);
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro ao carregar cartões', description: error.message, variant: 'destructive' });
    } else {
      setCards(data || []);
      // Uso do limite: faturas nao pagas + parcelas futuras da fatura mais recente
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, card_id, period_end, status, total_amount');
      const invoiceIds = (invoices ?? []).map((i) => i.id);
      const { data: items } = invoiceIds.length
        ? await supabase.from('invoice_items').select('invoice_id, amount, installment_current, installment_total').in('invoice_id', invoiceIds).not('installment_total', 'is', null)
        : { data: [] as { invoice_id: string; amount: number; installment_current: number | null; installment_total: number | null }[] };

      const computed = computeCardUsage(
        (invoices ?? []).map((i) => ({ ...i, total_amount: Number(i.total_amount) })),
        (items ?? []).map((i) => ({ ...i, amount: Number(i.amount) })),
      );
      setUsage(computed);
      const totals: Record<string, number> = {};
      for (const [cardId, u] of Object.entries(computed)) totals[cardId] = u.used;
      setOpenInvoiceTotals(totals);
    }
    setLoading(false);
    hasLoaded.current = true;
  }, [user, toast]);

  useEffect(() => { fetchCards(); }, [fetchCards]);
  useDataChanged(fetchCards, ['cards', 'transactions', 'people']);

  const createCard = async (data: {
    nickname: string;
    brand: string;
    issuer_bank: string;
    last_four_digits: string;
    total_limit: number;
    closing_day: number;
    due_day: number;
    holder_name: string;
  }) => {
    if (!user) return;
    const { data: card, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: user.id,
        nickname: data.nickname,
        brand: data.brand,
        issuer_bank: data.issuer_bank,
        last_four_digits: data.last_four_digits,
        total_limit: data.total_limit,
        closing_day: data.closing_day,
        due_day: data.due_day,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar cartão', description: error.message, variant: 'destructive' });
      return null;
    }

    // Create primary holder
    await supabase.from('card_holders').insert({
      card_id: card.id,
      holder_name: data.holder_name,
      is_primary: true,
    });

    toast({ title: 'Cartão criado com sucesso!' });
    notifyDataChanged('cards');
    fetchCards();
    return card as CreditCard;
  };

  const updateCard = async (id: string, data: Partial<CreditCard>) => {
    const { error } = await supabase.from('credit_cards').update(data).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar cartão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão atualizado!' });
      notifyDataChanged('cards');
      fetchCards();
    }
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir cartão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão excluído!' });
      notifyDataChanged('cards');
      fetchCards();
    }
  };

  return { cards, loading, openInvoiceTotals, usage, fetchCards, createCard, updateCard, deleteCard };
}

export function useInvoices(cardId: string) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [holders, setHolders] = useState<CardHolder[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  /** Divisao por pessoa dos lancamentos da fatura selecionada: item_id -> partes. */
  const [splits, setSplits] = useState<Record<string, Share[]>>({});
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<CreditCard | null>(null);

  const fetchAll = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);

    const [cardRes, invoicesRes, holdersRes] = await Promise.all([
      supabase.from('credit_cards').select('*').eq('id', cardId).single(),
      supabase.from('invoices').select('*').eq('card_id', cardId).order('period_start', { ascending: false }),
      supabase.from('card_holders').select('*').eq('card_id', cardId),
    ]);

    if (cardRes.data) setCard(cardRes.data as CreditCard);
    setInvoices((invoicesRes.data || []) as Invoice[]);
    setHolders((holdersRes.data || []) as CardHolder[]);
    setLoading(false);
  }, [cardId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useDataChanged(fetchAll, ['cards', 'people']);

  const fetchItems = useCallback(async (invoiceId: string) => {
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('transaction_date', { ascending: true });
    const list = (data || []) as InvoiceItem[];
    setItems(list);
    const ids = list.map((i) => i.id);
    const { data: parts } = ids.length
      ? await supabase.from('invoice_item_splits').select('item_id, person, amount').in('item_id', ids)
      : { data: [] as { item_id: string; person: string; amount: number }[] };
    const map: Record<string, Share[]> = {};
    for (const p of parts ?? []) (map[p.item_id] ??= []).push({ person: p.person, amount: Number(p.amount) });
    setSplits(map);
  }, []);

  /**
   * Divide um lancamento entre pessoas (ou desfaz, com lista vazia). A compra
   * continua uma so na fatura; as despesas espelhadas passam a ser uma por
   * parte, para a analise por pessoa refletir a divisao.
   */
  const setItemSplits = async (item: InvoiceItem, shares: Share[]) => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return false;

    const { error: delErr } = await supabase.from('invoice_item_splits').delete().eq('item_id', item.id);
    if (delErr) {
      toast({ title: 'Erro ao dividir', description: delErr.message, variant: 'destructive' });
      return false;
    }
    if (shares.length > 0) {
      const { error } = await supabase.from('invoice_item_splits').insert(shares.map((s) => ({ item_id: item.id, person: s.person, amount: s.amount })));
      if (error) {
        toast({ title: 'Erro ao dividir', description: error.message, variant: 'destructive' });
        return false;
      }
    }

    // Re-espelha: apaga as despesas do item e grava uma por parte (ou uma so, sem divisao).
    // Partes de terceiros nao viram despesa: ficam no controle de recebiveis.
    const thirdParties = await loadThirdPartySet(userId);
    await supabase.from('transactions').delete().eq('invoice_item_id', item.id);
    const rows = shares.length > 0
      ? (() => {
          const base = itemToTransaction({ ...item, amount: Number(item.amount), assigned_to: null }, userId);
          return base ? shares.filter((s) => !thirdParties.has(s.person)).map((s) => ({ ...base, holder_name: s.person, amount: s.amount, notes: `${MIRROR_NOTE} · dividido` })) : [];
        })()
      : (() => { const t = itemToTransaction({ ...item, amount: Number(item.amount) }, userId, thirdParties); return t ? [t] : []; })();
    if (rows.length) await supabase.from('transactions').insert(rows);

    await rememberAttribution(item, shares.length > 0 ? { shares } : null);
    setSplits((prev) => {
      const next = { ...prev };
      if (shares.length > 0) next[item.id] = shares; else delete next[item.id];
      return next;
    });
    toast({ title: shares.length > 0 ? `Dividido entre ${shares.length} pessoas` : 'Divisão removida' });
    return true;
  };

  const createInvoice = async () => {
    if (!card) return;
    const now = new Date();
    const closingDay = card.closing_day;
    let periodStart: Date, periodEnd: Date;

    if (now.getDate() <= closingDay) {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, closingDay + 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), closingDay);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), closingDay + 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, closingDay);
    }

    const { error } = await supabase.from('invoices').insert({
      card_id: cardId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      status: 'OPEN',
      total_amount: 0,
      previous_balance: 0,
    });

    if (error) {
      toast({ title: 'Erro ao criar fatura', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Fatura criada!' });
      fetchAll();
    }
  };

  const addItem = async (invoiceId: string, item: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>) => {
    const { error } = await supabase.from('invoice_items').insert({
      invoice_id: invoiceId,
      ...item,
    });
    if (error) {
      toast({ title: 'Erro ao adicionar lançamento', description: error.message, variant: 'destructive' });
      return false;
    }
    // Update invoice total
    await recalcTotal(invoiceId);
    await fetchItems(invoiceId);
    toast({ title: 'Lançamento adicionado!' });
    return true;
  };

  const addItemsBatch = async (invoiceId: string, batchItems: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[]) => {
    const rows = batchItems.map(item => ({ invoice_id: invoiceId, ...item }));
    const { error } = await supabase.from('invoice_items').insert(rows);
    if (error) {
      toast({ title: 'Erro na importação', description: error.message, variant: 'destructive' });
      return false;
    }
    await recalcTotal(invoiceId);
    await fetchItems(invoiceId);
    toast({ title: 'Importação concluída!' });
    return true;
  };

  /**
   * Realoca uma compra para outra pessoa (ou de volta ao titular com null).
   * A compra fica no mesmo cartao; muda so o responsavel, na fatura e na
   * despesa espelhada, para a analise por pessoa refletir quem gastou de fato.
   */
  const reassignItem = async (item: InvoiceItem, person: string | null) => {
    const assigned = person && person !== item.holder_name ? person : null;
    const { error } = await supabase.from('invoice_items').update({ assigned_to: assigned }).eq('id', item.id);
    if (error) {
      toast({ title: 'Erro ao realocar', description: error.message, variant: 'destructive' });
      return false;
    }
    // Re-espelha: terceiro nao tem despesa (fica em recebiveis); pessoa da casa tem uma.
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? '';
    const thirdParties = await loadThirdPartySet(userId);
    const mirrored = itemToTransaction({ ...item, amount: Number(item.amount), assigned_to: assigned }, userId, thirdParties);
    await supabase.from('transactions').delete().eq('invoice_item_id', item.id);
    if (mirrored) await supabase.from('transactions').insert(mirrored);
    await rememberAttribution(item, assigned ? { assigned_to: assigned } : null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, assigned_to: assigned } : i)));
    toast({ title: assigned ? `Realocado para ${assigned}` : `De volta para ${item.holder_name}` });
    return true;
  };

  const deleteInvoice = async (invoiceId: string) => {
    // invoice_items (e, depois, as transacoes espelhadas) caem por CASCADE.
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) {
      toast({ title: 'Erro ao excluir fatura', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Fatura excluída' });
    notifyDataChanged('cards');
    setItems([]);
    await fetchAll();
    return true;
  };

  const updatePreviousBalance = async (invoiceId: string, previousBalance: number) => {
    await supabase.from('invoices').update({ previous_balance: previousBalance }).eq('id', invoiceId);
    await recalcTotal(invoiceId);
    fetchAll();
  };

  const recalcTotal = async (invoiceId: string) => {
    const { data: allItems } = await supabase
      .from('invoice_items')
      .select('amount')
      .eq('invoice_id', invoiceId);
    
    const { data: inv } = await supabase
      .from('invoices')
      .select('previous_balance')
      .eq('id', invoiceId)
      .single();

    const itemsTotal = (allItems || []).reduce((s: number, i: any) => s + Number(i.amount), 0);
    const prevBalance = inv ? Number(inv.previous_balance) : 0;
    await supabase.from('invoices').update({ total_amount: itemsTotal + prevBalance }).eq('id', invoiceId);
    fetchAll();
  };

  return { card, invoices, holders, items, splits, loading, fetchAll, fetchItems, createInvoice, deleteInvoice, addItem, addItemsBatch, updatePreviousBalance, reassignItem, setItemSplits };
}
