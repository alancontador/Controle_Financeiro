import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { personOf } from '@/lib/people';
import type { CardKind } from '@/lib/cards/kinds';

export interface PersonCardSpend {
  lastFour: string;
  kind: CardKind | null;
  /** Gasto na fatura mais recente (compras menos estornos; pagamentos fora). */
  total: number;
  itemCount: number;
}

export interface PersonSpend {
  person: string;
  total: number;
  share: number;
  cards: PersonCardSpend[];
}

export interface CardPeopleData {
  /** Por cartao cadastrado: pessoas -> cartoes da fatura, na fatura mais recente. */
  byCard: Record<string, { invoiceLabel: string | null; people: PersonSpend[] }>;
  /** Consolidado de todos os cartoes cadastrados, por pessoa. */
  overall: PersonSpend[];
  loading: boolean;
  refetch: () => Promise<void>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const RE_PAYMENT = /\bPAG(TO|AMENTO)\b/i;

/**
 * Quem gasta quanto em cada cartao cadastrado, olhando a fatura mais recente
 * de cada um e abrindo por pessoa -> cartao da fatura (principal, virtual,
 * adicional). Base da aba "Meus Cartoes".
 */
export function useCardPeople(): CardPeopleData {
  const { user } = useAuth();
  const [byCard, setByCard] = useState<CardPeopleData['byCard']>({});
  const [overall, setOverall] = useState<PersonSpend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [invoicesRes, holdersRes] = await Promise.all([
      supabase.from('invoices').select('id, card_id, period_end').order('period_end', { ascending: false }),
      supabase.from('card_holders').select('card_id, holder_name, last_four, kind'),
    ]);

    // fatura mais recente por cartao
    const latest = new Map<string, { id: string; period_end: string }>();
    for (const inv of invoicesRes.data ?? []) if (!latest.has(inv.card_id)) latest.set(inv.card_id, { id: inv.id, period_end: inv.period_end });

    const invoiceIds = [...latest.values()].map((i) => i.id);
    const items = invoiceIds.length
      ? (await supabase.from('invoice_items').select('invoice_id, holder_name, card_last_four, card_kind, description, amount').in('invoice_id', invoiceIds)).data ?? []
      : [];

    const kindByCardNumber = new Map<string, CardKind | null>();
    for (const h of holdersRes.data ?? []) if (h.last_four) kindByCardNumber.set(`${h.card_id}:${h.last_four}`, (h.kind as CardKind) ?? null);

    const result: CardPeopleData['byCard'] = {};
    const overallMap = new Map<string, PersonSpend>();

    for (const [cardId, inv] of latest) {
      const people = new Map<string, PersonSpend>();
      for (const it of items) {
        if (it.invoice_id !== inv.id) continue;
        if (RE_PAYMENT.test(it.description)) continue;
        const person = personOf(it);
        const p = people.get(person) ?? { person, total: 0, share: 0, cards: [] };
        p.total += Number(it.amount);
        const lf = it.card_last_four ?? '';
        let c = p.cards.find((x) => x.lastFour === lf);
        if (!c) {
          c = { lastFour: lf, kind: (it.card_kind as CardKind) ?? kindByCardNumber.get(`${cardId}:${lf}`) ?? null, total: 0, itemCount: 0 };
          p.cards.push(c);
        }
        c.total += Number(it.amount);
        c.itemCount += 1;
        people.set(person, p);

        const o = overallMap.get(person) ?? { person, total: 0, share: 0, cards: [] };
        o.total += Number(it.amount);
        overallMap.set(person, o);
      }
      const list = [...people.values()].map((p) => ({ ...p, total: round2(p.total), cards: p.cards.map((c) => ({ ...c, total: round2(c.total) })).sort((a, b) => b.total - a.total) }));
      const grand = list.reduce((s, p) => s + p.total, 0);
      result[cardId] = {
        invoiceLabel: inv.period_end,
        people: list.map((p) => ({ ...p, share: grand > 0 ? round2(p.total / grand) : 0 })).sort((a, b) => b.total - a.total),
      };
    }

    const all = [...overallMap.values()].map((p) => ({ ...p, total: round2(p.total) }));
    const grandAll = all.reduce((s, p) => s + p.total, 0);
    setOverall(all.map((p) => ({ ...p, share: grandAll > 0 ? round2(p.total / grandAll) : 0 })).sort((a, b) => b.total - a.total));
    setByCard(result);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { byCard, overall, loading, refetch: fetch };
}
