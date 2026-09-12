import { describe, expect, it } from 'vitest';
import { COMMON_PERSON, personOf, summarizeByPerson, type PersonTx } from './people';

const tx = (over: Partial<PersonTx>): PersonTx => ({
  holder_name: 'ANA',
  amount: 100,
  type: 'expense',
  date: '2026-09-05',
  category_name: 'Mercado',
  ...over,
});

describe('personOf', () => {
  it('sem pessoa vira Casa/Comum', () => {
    expect(personOf({ holder_name: null })).toBe(COMMON_PERSON);
    expect(personOf({ holder_name: '  ' })).toBe(COMMON_PERSON);
    expect(personOf({ holder_name: 'ANA' })).toBe('ANA');
  });
});

describe('summarizeByPerson', () => {
  const txs = [
    tx({ holder_name: 'ANA', amount: 300, category_name: 'Mercado' }),
    tx({ holder_name: 'ANA', amount: 100, category_name: 'Pets' }),
    tx({ holder_name: 'BRUNO', amount: 500, category_name: 'Restaurantes' }),
    tx({ holder_name: null, amount: 100, category_name: 'Casa' }),
    tx({ holder_name: 'ANA', amount: 999, type: 'income' }), // receita nao entra
    tx({ holder_name: 'ANA', amount: -50, category_name: 'Mercado' }), // estorno reduz
    tx({ holder_name: 'BRUNO', amount: 200, date: '2026-08-20' }), // mes anterior
  ];

  it('soma despesas do mes por pessoa, ordena por total e calcula a fatia', () => {
    const r = summarizeByPerson(txs, '2026-09');
    // total do mes = 500 + (300 + 100 - 50) + 100 = 950
    expect(r.map((p) => [p.person, p.total, p.share])).toEqual([
      ['BRUNO', 500, 0.53],
      ['ANA', 350, 0.37],
      [COMMON_PERSON, 100, 0.11],
    ]);
    expect(r.reduce((s, p) => s + p.total, 0)).toBe(950);
  });

  it('traz as maiores categorias de cada pessoa', () => {
    const ana = summarizeByPerson(txs, '2026-09').find((p) => p.person === 'ANA')!;
    expect(ana.topCategories).toEqual([
      { category: 'Mercado', total: 250 },
      { category: 'Pets', total: 100 },
    ]);
  });

  it('compara com o mes anterior quando pedido', () => {
    const r = summarizeByPerson(txs, '2026-09', { previousMonth: '2026-08' });
    expect(r.find((p) => p.person === 'BRUNO')!.previousTotal).toBe(200);
    expect(r.find((p) => p.person === 'ANA')!.previousTotal).toBe(0);
  });

  it('mes sem despesas devolve lista vazia', () => {
    expect(summarizeByPerson(txs, '2025-01')).toEqual([]);
  });
});
