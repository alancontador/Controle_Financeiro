import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  const [openInvoiceTotals, setOpenInvoiceTotals] = useState<Record<string, number>>({});

  const fetchCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro ao carregar cartões', description: error.message, variant: 'destructive' });
    } else {
      setCards(data || []);
      // Fetch open invoice totals
      const { data: invoices } = await supabase
        .from('invoices')
        .select('card_id, total_amount')
        .eq('status', 'OPEN');
      
      const totals: Record<string, number> = {};
      (invoices || []).forEach((inv: any) => {
        totals[inv.card_id] = (totals[inv.card_id] || 0) + Number(inv.total_amount);
      });
      setOpenInvoiceTotals(totals);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

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
      return;
    }

    // Create primary holder
    await supabase.from('card_holders').insert({
      card_id: card.id,
      holder_name: data.holder_name,
      is_primary: true,
    });

    toast({ title: 'Cartão criado com sucesso!' });
    fetchCards();
  };

  const updateCard = async (id: string, data: Partial<CreditCard>) => {
    const { error } = await supabase.from('credit_cards').update(data).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar cartão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão atualizado!' });
      fetchCards();
    }
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir cartão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão excluído!' });
      fetchCards();
    }
  };

  return { cards, loading, openInvoiceTotals, fetchCards, createCard, updateCard, deleteCard };
}

export function useInvoices(cardId: string) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [holders, setHolders] = useState<CardHolder[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
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

  const fetchItems = useCallback(async (invoiceId: string) => {
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('transaction_date', { ascending: true });
    setItems((data || []) as InvoiceItem[]);
  }, []);

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

  return { card, invoices, holders, items, loading, fetchAll, fetchItems, createInvoice, addItem, addItemsBatch, updatePreviousBalance };
}
