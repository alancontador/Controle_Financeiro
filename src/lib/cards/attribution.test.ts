import { describe, expect, it } from 'vitest';
import { attributionKeys, resolveAttribution, sharesFromFractions, type AttributionMemory } from './attribution';

const item = {
  holder_name: 'FERNANDA',
  card_last_four: '4760',
  transaction_date: '2026-08-13',
  description: 'GUARULHOS',
  amount: 527.23,
  installment_current: 1,
  installment_total: 10,
};

describe('attributionKeys', () => {
  it('chave da compra ignora a parcela atual (a proxima parcela e a mesma compra) e a chave da descricao ignora valor e data', () => {
    const k = attributionKeys(item);
    expect(k.purchase).toBe('p:4760|2026-08-13|GUARULHOS|527.23|10');
    expect(k.description).toBe('d:4760|GUARULHOS');
    expect(attributionKeys({ ...item, installment_current: 2 }).purchase).toBe(k.purchase);
    expect(attributionKeys({ ...item, amount: 99, transaction_date: '2026-09-01' }).description).toBe(k.description);
  });

  it('descricao e normalizada (numero de loja e parcela colada nao mudam a chave)', () => {
    expect(attributionKeys({ ...item, description: 'MERCADO EXTRA 1326' }).description)
      .toBe(attributionKeys({ ...item, description: 'MERCADO EXTRA 2210' }).description);
  });
});

describe('resolveAttribution', () => {
  it('compra exata vence a regra por descricao', () => {
    const mem: AttributionMemory = new Map([
      ['p:4760|2026-08-13|GUARULHOS|527.23|10', { shares: [{ person: 'FERNANDA', fraction: 0.5 }, { person: 'JOSE', fraction: 0.5 }] }],
      ['d:4760|GUARULHOS', { assigned_to: 'JOSE' }],
    ]);
    expect(resolveAttribution(item, mem)).toEqual({ shares: [{ person: 'FERNANDA', fraction: 0.5 }, { person: 'JOSE', fraction: 0.5 }] });
  });

  it('sem compra exata, usa a regra por descricao (proxima compra na mesma loja)', () => {
    const mem: AttributionMemory = new Map([['d:4760|DECATHLON', { assigned_to: 'JOSE' }]]);
    expect(resolveAttribution({ ...item, description: 'DECATHLON', amount: 88.74 }, mem)).toEqual({ assigned_to: 'JOSE' });
  });

  it('sem memoria devolve null', () => {
    expect(resolveAttribution(item, new Map())).toBeNull();
  });

  it('regra que atribui ao proprio titular nao muda nada', () => {
    const mem: AttributionMemory = new Map([['d:4760|GUARULHOS', { assigned_to: 'FERNANDA' }]]);
    expect(resolveAttribution(item, mem)).toBeNull();
  });
});

describe('sharesFromFractions', () => {
  it('reconstroi as partes pelo valor atual e fecha ao centavo', () => {
    // 100 * 1/3 = 33,33 ; 100 * 2/3 = 66,67 -> soma 100
    expect(sharesFromFractions(100, [{ person: 'A', fraction: 1 / 3 }, { person: 'B', fraction: 2 / 3 }])).toEqual([
      { person: 'A', amount: 33.33 },
      { person: 'B', amount: 66.67 },
    ]);
    // 527,23 meio a meio: 263,62 + 263,61
    expect(sharesFromFractions(527.23, [{ person: 'A', fraction: 0.5 }, { person: 'B', fraction: 0.5 }])).toEqual([
      { person: 'A', amount: 263.62 },
      { person: 'B', amount: 263.61 },
    ]);
  });
});
