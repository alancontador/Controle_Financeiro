import { describe, expect, it } from 'vitest';
import { computeCardUsage } from './usage';

describe('computeCardUsage', () => {
  const invoices = [
    { id: 'i-jul', card_id: 'c1', period_end: '2026-07-28', status: 'PAID', total_amount: 5000 },
    { id: 'i-ago', card_id: 'c1', period_end: '2026-08-28', status: 'OPEN', total_amount: 6420.51 },
    { id: 'i-x', card_id: 'c2', period_end: '2026-08-10', status: 'CLOSED', total_amount: 900 },
  ];
  const items = [
    // fatura de agosto (mais recente do c1): parcelas restantes contam
    { invoice_id: 'i-ago', amount: 100, installment_current: 9, installment_total: 10 }, // 1 restante -> 100
    { invoice_id: 'i-ago', amount: 50, installment_current: 2, installment_total: 10 },  // 8 restantes -> 400
    { invoice_id: 'i-ago', amount: 30, installment_current: null, installment_total: null },
    // fatura de julho (antiga, ja paga): NAO conta, as parcelas dela ja estao refletidas na de agosto
    { invoice_id: 'i-jul', amount: 100, installment_current: 8, installment_total: 10 },
    // c2
    { invoice_id: 'i-x', amount: 20, installment_current: 1, installment_total: 3 }, // 2 restantes -> 40
  ];

  it('utilizado = faturas nao pagas + parcelas futuras da fatura mais recente', () => {
    const u = computeCardUsage(invoices, items);
    expect(u.c1).toEqual({ openInvoices: 6420.51, futureInstallments: 500, used: 6920.51 });
    expect(u.c2).toEqual({ openInvoices: 900, futureInstallments: 40, used: 940 });
  });

  it('fatura paga nao entra no utilizado', () => {
    const u = computeCardUsage([invoices[0]], items);
    expect(u.c1.openInvoices).toBe(0);
  });

  it('cartao sem faturas nao aparece', () => {
    expect(computeCardUsage([], [])).toEqual({});
  });
});
