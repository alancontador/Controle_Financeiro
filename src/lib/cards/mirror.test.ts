import { describe, expect, it } from 'vitest';
import { isPaymentLine, itemToTransaction } from './mirror';

const base = {
  id: 'item-1',
  holder_name: 'ANA SILVA',
  card_last_four: '1111',
  description: 'DROGARIA DELTA',
  amount: 47.69,
  transaction_date: '2026-08-07',
  category_id: 'cat-saude',
};

describe('isPaymentLine', () => {
  it('reconhece pagamento da fatura em varias grafias', () => {
    expect(isPaymentLine('PAGTO ANTECIPADO PIX')).toBe(true);
    expect(isPaymentLine('PAGAMENTO FATURA')).toBe(true);
    expect(isPaymentLine('Pagto. Débito automático')).toBe(true);
  });

  it('nao confunde compra com pagamento', () => {
    expect(isPaymentLine('PAG SEGURO LOJA')).toBe(false);
    expect(isPaymentLine('ESTORNO ANUIDADE')).toBe(false);
  });
});

describe('itemToTransaction', () => {
  it('compra vira despesa na data da compra, na categoria, ligada ao item', () => {
    expect(itemToTransaction(base, 'user-1')).toEqual({
      user_id: 'user-1',
      holder_name: 'ANA SILVA',
      card_last_four: '1111',
      description: 'DROGARIA DELTA',
      amount: 47.69,
      type: 'expense',
      date: '2026-08-07',
      category_id: 'cat-saude',
      invoice_item_id: 'item-1',
      notes: 'Importado da fatura do cartão',
    });
  });

  it('pagamento da fatura NAO vira transacao (seria contar o gasto duas vezes)', () => {
    expect(itemToTransaction({ ...base, description: 'PAGTO ANTECIPADO PIX', amount: -5931.47 }, 'user-1')).toBeNull();
  });

  it('estorno vira despesa negativa: reduz o gasto da categoria', () => {
    const t = itemToTransaction({ ...base, description: 'ESTORNO ANUIDADE', amount: -59 }, 'user-1')!;
    expect(t.type).toBe('expense');
    expect(t.amount).toBe(-59);
  });

  it('sem categoria resolvida, grava sem category_id (aparece como sem categoria)', () => {
    expect(itemToTransaction({ ...base, category_id: null }, 'user-1')!.category_id).toBeNull();
  });
});
