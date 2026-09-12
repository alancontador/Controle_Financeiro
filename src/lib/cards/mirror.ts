/**
 * Espelha lancamentos de fatura em `transactions`, para o resto do app
 * (dashboard, orcamentos, relatorios, insights) enxergar o gasto do cartao.
 *
 * Decisoes (spec 2026-09-11):
 * - cada compra vira uma despesa na DATA DA COMPRA, na categoria dela;
 * - o pagamento da fatura NAO vira transacao: as compras ja sao o gasto;
 * - estorno vira despesa negativa, reduzindo o gasto da categoria.
 */

export interface MirrorableItem {
  id: string;
  holder_name: string;
  card_last_four: string | null;
  description: string;
  amount: number;
  transaction_date: string;
  category_id: string | null;
}

export interface MirroredTransaction {
  user_id: string;
  /** Quem gastou (pessoa do bloco da fatura). */
  holder_name: string;
  card_last_four: string | null;
  description: string;
  amount: number;
  type: 'expense';
  date: string;
  category_id: string | null;
  invoice_item_id: string;
  notes: string;
}

export const MIRROR_NOTE = 'Importado da fatura do cartão';

const RE_PAYMENT = /\bPAG(TO|AMENTO)\b/i;

export function isPaymentLine(description: string): boolean {
  return RE_PAYMENT.test(description.replace(/\./g, ''));
}

export function itemToTransaction(item: MirrorableItem, userId: string): MirroredTransaction | null {
  if (isPaymentLine(item.description)) return null;
  return {
    user_id: userId,
    holder_name: item.holder_name,
    card_last_four: item.card_last_four,
    description: item.description,
    amount: item.amount,
    type: 'expense',
    date: item.transaction_date,
    category_id: item.category_id,
    invoice_item_id: item.id,
    notes: MIRROR_NOTE,
  };
}
