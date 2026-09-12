import { normalizeDescription } from '@/lib/pdf/categorize';
import type { Share } from './split';

/**
 * Memoria de atribuicao: o que o usuario decidiu sobre "de quem e" uma compra
 * (realocacao ou divisao), para reaplicar ao reimportar a mesma fatura e nas
 * proximas faturas. Dois niveis:
 * - compra exata (cartao|data|descricao|valor|total de parcelas): a proxima
 *   parcela da mesma compra tem tudo igual menos a parcela atual;
 * - descricao no cartao (cartao|descricao): compras novas no mesmo lugar.
 * A compra exata vence a descricao.
 */

export interface AttributableItem {
  holder_name: string;
  card_last_four: string | null;
  transaction_date: string;
  description: string;
  amount: number;
  installment_total: number | null;
  /** Ignorada na chave: a proxima parcela e a mesma compra. */
  installment_current?: number | null;
}

export interface FractionShare {
  person: string;
  /** Parte do valor (0..1). */
  fraction: number;
}

export interface Attribution {
  assigned_to?: string | null;
  shares?: FractionShare[];
}

export type AttributionMemory = ReadonlyMap<string, Attribution>;

export function attributionKeys(item: AttributableItem): { purchase: string; description: string } {
  const card = item.card_last_four ?? '';
  const desc = normalizeDescription(item.description);
  return {
    purchase: `p:${card}|${item.transaction_date}|${desc}|${item.amount.toFixed(2)}|${item.installment_total ?? ''}`,
    description: `d:${card}|${desc}`,
  };
}

/** O que aplicar a um lancamento recem-importado, ou null se nao ha memoria util. */
export function resolveAttribution(item: AttributableItem, memory: AttributionMemory): Attribution | null {
  const keys = attributionKeys(item);
  const hit = memory.get(keys.purchase) ?? memory.get(keys.description);
  if (!hit) return null;
  if (hit.shares && hit.shares.length >= 2) return { shares: hit.shares };
  if (hit.assigned_to && hit.assigned_to !== item.holder_name) return { assigned_to: hit.assigned_to };
  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Partes em valor a partir das fracoes, com o resto de centavos na ultima pessoa. */
export function sharesFromFractions(amount: number, fractions: FractionShare[]): Share[] {
  if (fractions.length === 0) return [];
  const shares = fractions.map((f) => ({ person: f.person, amount: round2(amount * f.fraction) }));
  const sum = round2(shares.reduce((s, x) => s + x.amount, 0));
  shares[shares.length - 1].amount = round2(shares[shares.length - 1].amount + (amount - sum));
  return shares;
}

/** Fracoes a partir de partes em valor (para gravar na memoria). */
export function fractionsFromShares(amount: number, shares: Share[]): FractionShare[] {
  if (amount === 0) return [];
  return shares.map((s) => ({ person: s.person, fraction: s.amount / amount }));
}
