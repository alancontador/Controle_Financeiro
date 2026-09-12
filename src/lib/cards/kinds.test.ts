import { describe, expect, it } from 'vitest';
import { classifyInvoiceCards } from './kinds';

const header = {
  lastFour: '5349',
  cards: [
    { holder: 'JOSE', lastFour: '5349' },
    { holder: 'JOSE', lastFour: '2876' },
    { holder: 'JOSE', lastFour: '2020' },
    { holder: 'FERNANDA', lastFour: '4760' },
  ],
};

describe('classifyInvoiceCards', () => {
  it('numero do cabecalho e o principal; mesmo titular = virtual; outra pessoa = adicional', () => {
    expect(classifyInvoiceCards(header)).toEqual([
      { holder: 'JOSE', lastFour: '5349', kind: 'principal' },
      { holder: 'JOSE', lastFour: '2876', kind: 'virtual' },
      { holder: 'JOSE', lastFour: '2020', kind: 'virtual' },
      { holder: 'FERNANDA', lastFour: '4760', kind: 'adicional' },
    ]);
  });

  it('o que o usuario ja classificou antes vence a inferencia', () => {
    const known = new Map([['2876', 'adicional' as const]]);
    expect(classifyInvoiceCards(header, known).find((c) => c.lastFour === '2876')!.kind).toBe('adicional');
  });

  it('sem numero no cabecalho, o primeiro cartao e o principal', () => {
    const r = classifyInvoiceCards({ lastFour: undefined, cards: header.cards });
    expect(r[0].kind).toBe('principal');
    expect(r[3].kind).toBe('adicional');
  });

  it('compara titulares sem se importar com caixa ou espacos', () => {
    const r = classifyInvoiceCards({ lastFour: '1111', cards: [{ holder: 'Ana Silva', lastFour: '1111' }, { holder: 'ANA  SILVA', lastFour: '2222' }] });
    expect(r[1].kind).toBe('virtual');
  });
});
