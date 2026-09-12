import { describe, expect, it } from 'vitest';
import { computeReceivables } from './receivables';

describe('computeReceivables', () => {
  const charges = [
    { person: 'CARLOS', amount: 100, date: '2026-08-01', description: 'LOJA A' },
    { person: 'CARLOS', amount: 50.5, date: '2026-08-10', description: 'LOJA B' },
    { person: 'CARLOS', amount: -10, date: '2026-08-12', description: 'ESTORNO LOJA A' }, // estorno reduz o que ele deve
    { person: 'BIA', amount: 200, date: '2026-08-05', description: 'HOTEL' },
  ];
  const payments = [
    { person: 'CARLOS', amount: 60, date: '2026-08-15' },
    { person: 'BIA', amount: 200, date: '2026-08-20' },
  ];

  it('saldo = compras atribuidas - pagamentos, por pessoa, maior saldo primeiro', () => {
    const r = computeReceivables(charges, payments);
    // CARLOS: 100 + 50,5 - 10 = 140,5 cobrado; 60 pago; deve 80,5. BIA: 200 - 200 = 0.
    expect(r.map((x) => [x.person, x.charged, x.paid, x.balance])).toEqual([
      ['CARLOS', 140.5, 60, 80.5],
      ['BIA', 200, 200, 0],
    ]);
  });

  it('pagamento sem compra aparece como saldo negativo (credito a favor da pessoa)', () => {
    const r = computeReceivables([], [{ person: 'DAN', amount: 30, date: '2026-08-01' }]);
    expect(r[0]).toMatchObject({ person: 'DAN', charged: 0, paid: 30, balance: -30 });
  });

  it('inclui as pessoas pedidas mesmo sem movimento', () => {
    const r = computeReceivables([], [], ['EVA']);
    expect(r).toEqual([{ person: 'EVA', charged: 0, paid: 0, balance: 0 }]);
  });
});
