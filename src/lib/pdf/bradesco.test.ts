import { describe, expect, it } from 'vitest';
import { parseBradescoFatura } from './bradesco';
import type { PdfLine } from './types';

/**
 * Monta uma linha ja agrupada, com as coordenadas x que o pdf.js devolve para a
 * fatura mensal do Bradesco. Os dados sao ficticios; so a geometria e a real.
 */
function row(page: number, ...cells: [text: string, x: number][]): PdfLine {
  const items = cells.map(([text, x]) => ({ text, x, y: 0 }));
  return { page, y: 0, items, text: items.map((i) => i.text).join(' ') };
}

// Colunas reais da fatura (em pontos): data 45 | descricao 66 | cidade 205 | valor ~320-353 | coluna da direita 364+
const X = { date: 45.4, desc: 66.6, inst: 116.1, city: 205.5, value: 327.6, right: 364.3, right2: 401.2 };

function faturaSintetica(): PdfLine[] {
  return [
    // ---- pagina 1: resumo ----
    row(1, ['ELO GRAFITE', 414.7]),
    row(1, ['Total da fatura', 420.7], ['Vencimento', 497.4]),
    row(1, ['R$ 1.480,00', 429.1], ['10/09/2026', 497.4]),
    row(1, ['Previsão de fechamento da próxima fatura: 29/09/2026', 417.0]),
    row(1, ['Limite de compras', 417.0], ['Limite de saque', 487.8]),
    row(1, ['R$ 23.200,00', 426.0], ['R$ 3.480,00', 493.0]),
    row(1, ['Saldo anterior......................... R$', 39.7], ['800,00', 143.4]),
    row(1, ['(=)Total.................................... R$', 39.7], ['1.480,00', 143.4]),

    // ---- pagina 2: lancamentos ----
    row(2, ['Número do Cartão', 39.7], ['1234 XXXX XXXX 1111', 130.4]),
    // "Disponível em" e a data ficam em linhas diferentes (8pt), na coluna da direita
    row(2, ['Disponível em', 503.8]),
    row(2, ['Data', 39.7], ['Histórico de Lançamentos', 66.6], ['Cidade', 205.5], ['US$', 290], ['R$', 335]),
    // pagamento antes de qualquer bloco de cartao, com o sinal colado no valor
    row(2, ['05/08', X.date], ['PAGTO ANTECIPADO PIX', 73.7], ['800,00 -', 320.4], ['28/08/2026', 507.5]),
    // cabecalho do cartao com vazamento da coluna da direita
    row(2, ['ANA SILVA', X.date], ['Cartão', 209.7], ['1234 XXXX XXXX 1111', 232.1], ['Crédito Rotativo / Atraso', X.right]),
    // compra parcelada de dezembro do ano anterior, com vazamento de limites
    row(2, ['17/12', X.date], ['LOJA ALFA', X.desc], ['09/10', X.inst], ['SAO PAULO', X.city], ['100,00', X.value], ['Compras', X.right], ['R$ 23.200,00', X.right2]),
    row(2, ['07/03', X.date], ['MERCADO BETA', X.desc], ['SAO PAULO', X.city], ['50,50', 328.3], ['Saque', X.right], ['R$ 3.480,00', X.right2]),
    // parcela colada no nome do estabelecimento
    row(2, ['11/07', X.date], ['LUNTA COMERCIO DE VE02/10', X.desc], ['SAO PAULO', X.city], ['69,99', 328.8]),
    // estorno: sinal de menos vem como item separado depois do valor
    row(2, ['28/07', X.date], ['ESTORNO ANUIDADE', X.desc], ['59,00', 328.5], ['-', 347.2]),
    row(2, ['11/10', X.date], ['GALPAO GAMA', X.desc], ['11/12', 128.3], ['SAO', X.city], ['104,16', 327.5]),
    // cidade que quebrou para a linha de baixo: nao e lancamento
    row(2, ['BERNARDO', X.city]),
    row(2, ['Total para ANA SILVA', X.date], ['265,65', 318.0]),

    row(2, ['BRUNO COSTA', X.date], ['Cartão', 209.7], ['1234 XXXX XXXX 2222', 232.1]),
    row(2, ['20/08', X.date], ['DROGARIA DELTA', X.desc], ['GUARULHOS', X.city], ['1.214,35', 322.0]),
    row(2, ['Total para BRUNO COSTA', X.date], ['1.214,35', 318.0]),

    // ---- pagina 3: total ----
    row(3, ['Total da fatura em real', X.date], ['1.480,00', 319.8]),
  ];
}

describe('parseBradescoFatura', () => {
  const result = parseBradescoFatura(faturaSintetica());

  it('nao devolve erro para uma fatura valida', () => {
    expect(result.error).toBeUndefined();
  });

  it('le vencimento, total e saldo anterior do resumo', () => {
    expect(result.dueDate).toBe('2026-09-10');
    expect(result.totalFatura).toBe(1480);
    expect(result.previousBalance).toBe(800);
  });

  it('extrai todos os lancamentos, e so eles', () => {
    expect(result.items).toHaveLength(7);
  });

  it('atribui cada lancamento ao cartao do bloco em que aparece', () => {
    const holders = result.items.map((i) => i.holder_name);
    expect(holders).toEqual([
      'Pagamentos',
      'ANA SILVA (final 1111)',
      'ANA SILVA (final 1111)',
      'ANA SILVA (final 1111)',
      'ANA SILVA (final 1111)',
      'ANA SILVA (final 1111)',
      'BRUNO COSTA (final 2222)',
    ]);
  });

  it('nao confunde "Número do Cartão" com o cabecalho de um titular', () => {
    expect(result.items.some((i) => i.holder_name.includes('Número'))).toBe(false);
  });

  it('pega o valor da coluna R$ e ignora os limites que vazam da coluna da direita', () => {
    const alfa = result.items.find((i) => i.description === 'LOJA ALFA')!;
    expect(alfa.amount).toBe(100);
    const beta = result.items.find((i) => i.description === 'MERCADO BETA')!;
    expect(beta.amount).toBe(50.5);
  });

  it('le valor com separador de milhar', () => {
    expect(result.items.find((i) => i.description === 'DROGARIA DELTA')!.amount).toBe(1214.35);
  });

  it('trata o sinal de menos como credito, colado ou como item separado', () => {
    expect(result.items.find((i) => i.description === 'PAGTO ANTECIPADO PIX')!.amount).toBe(-800);
    expect(result.items.find((i) => i.description === 'ESTORNO ANUIDADE')!.amount).toBe(-59);
  });

  it('separa a parcela da descricao, inclusive quando vem colada no nome', () => {
    const alfa = result.items.find((i) => i.description === 'LOJA ALFA')!;
    expect(alfa.installment_current).toBe(9);
    expect(alfa.installment_total).toBe(10);

    const lunta = result.items.find((i) => i.description === 'LUNTA COMERCIO DE VE')!;
    expect(lunta.installment_current).toBe(2);
    expect(lunta.installment_total).toBe(10);

    expect(result.items.find((i) => i.description === 'MERCADO BETA')!.installment_current).toBeNull();
  });

  it('nao leva a cidade para a descricao', () => {
    expect(result.items.some((i) => /SAO PAULO|GUARULHOS|BERNARDO/.test(i.description))).toBe(false);
  });

  it('ancora o ano no vencimento: mes maior que o do vencimento e do ano anterior', () => {
    expect(result.items.find((i) => i.description === 'LOJA ALFA')!.transaction_date).toBe('2025-12-17');
    expect(result.items.find((i) => i.description === 'GALPAO GAMA')!.transaction_date).toBe('2025-10-11');
    expect(result.items.find((i) => i.description === 'DROGARIA DELTA')!.transaction_date).toBe('2026-08-20');
    expect(result.items.find((i) => i.description === 'PAGTO ANTECIPADO PIX')!.transaction_date).toBe('2026-08-05');
  });

  it('categoriza automaticamente pela descricao', () => {
    expect(result.items.find((i) => i.description === 'DROGARIA DELTA')!.category).toBe('Farmácia');
  });

  it('confere a soma de cada cartao com o subtotal declarado na fatura', () => {
    expect(result.cardTotals).toEqual([
      { holder: 'ANA SILVA (final 1111)', declared: 265.65, parsed: 265.65 },
      { holder: 'BRUNO COSTA (final 2222)', declared: 1214.35, parsed: 1214.35 },
    ]);
  });

  it('confere a soma dos lancamentos dos cartoes com o total da fatura', () => {
    expect(result.parsedTotal).toBe(1480);
  });

  it('le o cabecalho do cartao para pre-preencher o cadastro', () => {
    expect(result.header).toEqual({
      bank: 'Bradesco',
      brand: 'Elo',
      brandLabel: 'ELO GRAFITE',
      lastFour: '1111',
      limit: 23200,
      closingDate: '2026-08-28',
      holders: ['ANA SILVA', 'BRUNO COSTA'],
    });
  });

  it('sem "Disponível em", deriva o fechamento da previsao da proxima fatura (um mes antes)', () => {
    const lines = faturaSintetica().filter((l) => !/Dispon/.test(l.text)).map((l) =>
      l.items.some((i) => i.text === '28/08/2026')
        ? { ...l, items: l.items.filter((i) => i.text !== '28/08/2026'), text: l.text.replace(' 28/08/2026', '') }
        : l,
    );
    expect(parseBradescoFatura(lines).header.closingDate).toBe('2026-08-29');
  });

  it('devolve erro quando nao ha lancamentos', () => {
    const r = parseBradescoFatura([row(1, ['qualquer coisa', 40])]);
    expect(r.items).toHaveLength(0);
    expect(r.error).toMatch(/lan[cç]amentos/i);
  });

  it('nao quebra sem vencimento: usa o ano corrente como referencia', () => {
    const lines = faturaSintetica().filter((l) => !/10\/09\/2026/.test(l.text));
    const r = parseBradescoFatura(lines, new Date(2026, 8, 11));
    expect(r.dueDate).toBeUndefined();
    expect(r.items.find((i) => i.description === 'LOJA ALFA')!.transaction_date).toBe('2025-12-17');
  });
});
