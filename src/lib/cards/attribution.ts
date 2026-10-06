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

/** O que a revisao da importacao decidiu para um lancamento. */
export interface ReviewChoice {
  /** Responsavel escolhido na revisao (null = o titular do cartao). */
  assignedInReview?: string | null;
  /** O usuario mexeu no responsavel (inclusive escolhendo o titular de volta). */
  personTouched?: boolean;
  /** Divisao feita na revisao; [] = tirou a divisao lembrada; undefined = nao mexeu. */
  splitShares?: Share[];
}

export interface AttributionDecision {
  /** Vai para invoice_items.assigned_to. */
  assigned: string | null;
  /** Divisao a gravar em invoice_item_splits (vazio = nenhuma). */
  splitToApply: Share[];
  /** O que gravar na memoria; null = nao mexer no que ja esta lembrado. */
  memory: { assigned_to: string | null; shares: FractionShare[] | null } | null;
}

/**
 * Junta a escolha da revisao com o que estava lembrado de importacoes anteriores.
 * Regra: o que o usuario escolheu agora sempre vence a memoria - inclusive
 * escolher o titular de volta, que antes era confundido com "nao mexeu" e fazia
 * a realocacao antiga voltar sozinha.
 */
export function decideImportAttribution(amount: number, choice: ReviewChoice, remembered: Attribution | null): AttributionDecision {
  const assignedInReview = choice.assignedInReview ?? null;

  if (choice.splitShares && choice.splitShares.length >= 2) {
    const fractions = fractionsFromShares(amount, choice.splitShares);
    return { assigned: null, splitToApply: choice.splitShares, memory: { assigned_to: null, shares: fractions } };
  }
  if (choice.splitShares && choice.splitShares.length === 0 && remembered?.shares) {
    return { assigned: assignedInReview, splitToApply: [], memory: { assigned_to: assignedInReview, shares: null } };
  }
  if (assignedInReview) {
    return { assigned: assignedInReview, splitToApply: [], memory: { assigned_to: assignedInReview, shares: null } };
  }
  if (choice.personTouched) {
    // Escolheu o titular: esquece a realocacao lembrada em vez de reaplica-la.
    return { assigned: null, splitToApply: [], memory: { assigned_to: null, shares: null } };
  }
  if (remembered?.shares) {
    return { assigned: null, splitToApply: sharesFromFractions(amount, remembered.shares), memory: null };
  }
  if (remembered?.assigned_to) {
    return { assigned: remembered.assigned_to, splitToApply: [], memory: null };
  }
  return { assigned: null, splitToApply: [], memory: null };
}
