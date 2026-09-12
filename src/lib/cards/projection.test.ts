import { describe, expect, it } from 'vitest';
import { projectUpcomingInvoices, type ProjectionItem } from './projection';

const item = (over: Partial<ProjectionItem>): ProjectionItem => ({
  cardId: 'card-1',
  invoiceMonth: '2026-08',
  description: 'LOJA',
  amount: 100,
  installment_current: null,
  installment_total: null,
  ...over,
});

describe('projectUpcomingInvoices', () => {
  it('comeca no mes seguinte a fatura mais recente e cobre o horizonte pedido', () => {
    const p = projectUpcomingInvoices([item({})], { months: 3 });
    expect(p.map((m) => m.month)).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('parcela 09/10 compromete exatamente uma proxima fatura', () => {
    const p = projectUpcomingInvoices([item({ description: 'MOTO ONE', amount: 101.99, installment_current: 9, installment_total: 10 })], { months: 3 });
    expect(p.map((m) => m.committed)).toEqual([101.99, 0, 0]);
  });

  it('parcela 02/10 compromete as 8 seguintes (limitado ao horizonte)', () => {
    const p = projectUpcomingInvoices([item({ amount: 69.99, installment_current: 2, installment_total: 10 })], { months: 6 });
    expect(p.every((m) => m.committed === 69.99)).toBe(true);
  });

  it('ultima parcela (10/10) nao compromete nada', () => {
    const p = projectUpcomingInvoices([item({ installment_current: 10, installment_total: 10 })], { months: 2 });
    expect(p.map((m) => m.committed)).toEqual([0, 0]);
  });

  it('so a fatura mais recente de cada cartao conta para parcelas (a antiga ja esta contida nela)', () => {
    const p = projectUpcomingInvoices(
      [
        item({ invoiceMonth: '2026-07', description: 'TV', amount: 200, installment_current: 1, installment_total: 3 }),
        item({ invoiceMonth: '2026-08', description: 'TV', amount: 200, installment_current: 2, installment_total: 3 }),
      ],
      { months: 3 },
    );
    expect(p.map((m) => m.committed)).toEqual([200, 0, 0]);
  });

  it('cartoes diferentes somam, cada um pela sua fatura mais recente', () => {
    const p = projectUpcomingInvoices(
      [
        item({ cardId: 'a', invoiceMonth: '2026-08', amount: 50, installment_current: 1, installment_total: 2 }),
        item({ cardId: 'b', invoiceMonth: '2026-07', amount: 30, installment_current: 1, installment_total: 2 }),
      ],
      { months: 2 },
    );
    // cartao b: 2026-07 +1 = 2026-08, que ja passou em relacao ao inicio (2026-09): fica de fora
    expect(p.map((m) => m.committed)).toEqual([50, 0]);
  });

  it('descricao que se repete em duas faturas vira recorrente, com a media por fatura', () => {
    const p = projectUpcomingInvoices(
      [
        item({ invoiceMonth: '2026-07', description: 'NETFLIX COM', amount: 39.9 }),
        item({ invoiceMonth: '2026-08', description: 'NETFLIX COM', amount: 44.9 }),
      ],
      { months: 2 },
    );
    expect(p.map((m) => m.estimated)).toEqual([42.4, 42.4]);
  });

  it('mesma descricao e mesmo valor repetidos numa fatura so tambem vira recorrente', () => {
    const p = projectUpcomingInvoices(
      [
        item({ description: 'APPLE COM BILL', amount: 19.9 }),
        item({ description: 'APPLE COM BILL', amount: 19.9 }),
        item({ description: 'APPLE COM BILL', amount: 19.9 }),
        item({ description: 'APPLE COM BILL', amount: 129.9 }), // valor unico: nao entra
      ],
      { months: 1 },
    );
    expect(p[0].estimated).toBe(59.7);
  });

  it('memoria da descricao ignora numero de loja: MERCADO EXTRA 1326 e MERCADO EXTRA 2210 sao o mesmo', () => {
    const p = projectUpcomingInvoices(
      [
        item({ invoiceMonth: '2026-07', description: 'MERCADO EXTRA 1326', amount: 100 }),
        item({ invoiceMonth: '2026-08', description: 'MERCADO EXTRA 2210', amount: 300 }),
      ],
      { months: 1 },
    );
    expect(p[0].estimated).toBe(200);
  });

  it('parcelas nao entram no recorrente (ja estao no comprometido) nem pagamentos/estornos', () => {
    const p = projectUpcomingInvoices(
      [
        item({ invoiceMonth: '2026-07', description: 'TV', amount: 200, installment_current: 1, installment_total: 3 }),
        item({ invoiceMonth: '2026-08', description: 'TV', amount: 200, installment_current: 2, installment_total: 3 }),
        item({ invoiceMonth: '2026-07', description: 'PAGTO ANTECIPADO PIX', amount: -500 }),
        item({ invoiceMonth: '2026-08', description: 'PAGTO ANTECIPADO PIX', amount: -600 }),
      ],
      { months: 1 },
    );
    expect(p[0].estimated).toBe(0);
  });

  it('sem itens devolve lista vazia', () => {
    expect(projectUpcomingInvoices([], { months: 3 })).toEqual([]);
  });
});
