import { describe, expect, it } from 'vitest';
import { parseItauFatura } from './itau';
import { detectBank } from './invoice';
import type { PdfLine } from './types';

/** Linha ja agrupada, com as coordenadas x reais da fatura do Itaú; dados ficticios. */
function row(page: number, ...cells: [text: string, x: number][]): PdfLine {
  const items = cells.map(([text, x]) => ({ text, x, y: 0 }));
  return { page, y: 0, items, text: items.map((i) => i.text).join(' ') };
}

// Colunas reais (pontos): data 133 | descricao 160.7 | valor termina ~331 | coluna da direita (avisos) 350+
const X = { date: 133, desc: 160.7, value: 313.9, right: 350 };

function faturaSintetica(): PdfLine[] {
  return [
    // ---- pagina 1 ----
    row(1, ['JOSE DA SILVA', 121.3], ['Resumo da fatura em R$', 450.9]),
    row(1, ['Total da fatura anterior', 365.2], ['800,00', 541.9]),
    row(1, ['Pagamentos efetuados', 365.2], ['800,00', 541.9]),
    row(1, ['Lançamentos atuais', 365.2], ['1.215,71', 537.9]),
    row(1, ['Vencimento: 08/09/2026', 231.4], ['Total desta fatura', 365.2], ['1.215,71', 537.6]),
    row(1, ['Emissão: 29/08/2026', 241.7]),
    row(1, ['Previsão próx. Fechamento: 28/09/2026', 194.6]),
    row(1, ['Titular', 68.7], ['JOSE DA SILVA', 95.9]),
    row(1, ['Cartão', 68.7], ['4480.XXXX.XXXX.2684', 95.9]),
    row(1, ['O total da sua fatura é:', 49.8], ['Com vencimento em:', 240], ['Limite total de crédito:', 431.3]),
    row(1, ['R$ 1.215,71', 49.8], ['08/09/2026', 254.9], ['R$ 11.500,00', 447]),
    row(1, ['Platinum', 513]),
    row(1, ['ITAU UNIBANCO HOLDING S.A. - 60.872.504/0001-23', 44.6]),
    // datas do boleto nao sao lancamentos
    row(1, ['08/09/2026', 44.6], ['02066685788/00000000001511551844', 125.6]),

    // ---- pagina 2 ----
    row(2, ['Previsão para o próximo fechamento:', 134.7], ['28/09/2026', 245.5], ['.', 273.9]),
    row(2, ['Lançamentos: compras e saques', 133], ['Os juros e encargos que você irá pagar são os apresentados na', X.right]),
    row(2, ['DATA', 133], ['PRODUTOS/SERVIÇOS', 160.7], ['VALOR EM R$', 289.2]),
    // pagamento da fatura anterior, com sinal na frente
    row(2, ['05/08', X.date], ['PAGAMENTO EFETUADO', X.desc], ['-800,00', 310], ['Fique atento aos encargos para o próximo', X.right]),
    // compra parcelada, com "02/05" colado no fim da descricao, e vazamento da direita
    row(2, ['31/07', X.date], ['LOJA ALFA 02/05', X.desc], ['100,00', X.value], ['período', 351.6], ['(05/09 a 04/10)', 386.9]),
    row(2, ['31/07', X.date], ['PgConta EXPRESS NETWORK', X.desc], ['88,00', X.value]),
    row(2, ['Principal (R$ 82,55) + Juros (R$ 5,45)', X.desc]),
    // estorno com sinal depois do valor
    row(2, ['02/08', X.date], ['ESTORNO LOJA BETA', X.desc], ['50,00-', 312]),
    row(2, ['Lançamentos compras e saques', 133], ['138,00', 310.5]),
    row(2, ['Lançamentos: produtos e serviços', 133]),
    row(2, ['DATA', 133], ['PRODUTOS/SERVIÇOS', 160.7], ['VALOR EM R$', 289.2]),
    row(2, ['31/07', X.date], ['PgConta HINOVA PAY INST', X.desc], ['127,71', 313.6]),
    row(2, ['Principal (R$ 119,80) + Juros (R$ 7,91)', X.desc]),
    // cartao adicional em bloco proprio
    row(2, ['MARIA DA SILVA final 1234', 133]),
    row(2, ['10/08', X.date], ['FARMACIA GAMA', X.desc], ['950,00', 310]),
    row(2, ['Total dos lançamentos atuais', 133], ['1.215,71', 310.5]),
    row(2, ['Limite total de crédito', 133.4], ['11.500,00', 298.2]),
    row(2, ['Limite total utilizado', 133.4], ['1.215,71', 310.5]),
  ];
}

describe('parseItauFatura', () => {
  const result = parseItauFatura(faturaSintetica());

  it('e detectada como Itaú', () => {
    expect(detectBank(faturaSintetica())).toBe('Itaú');
  });

  it('le o resumo: vencimento, fatura anterior, total dos lancamentos, limite', () => {
    expect(result.error).toBeUndefined();
    expect(result.dueDate).toBe('2026-09-08');
    expect(result.previousBalance).toBe(800);
    expect(result.totalFatura).toBe(1215.71);
    expect(result.header.limit).toBe(11500);
  });

  it('cabecalho: banco, bandeira pelo BIN, nivel, final, fechamento e cartoes', () => {
    expect(result.header.bank).toBe('Itaú');
    expect(result.header.brand).toBe('Visa');
    expect(result.header.brandLabel).toBe('Visa Platinum');
    expect(result.header.lastFour).toBe('2684');
    // Um mes antes da previsao do proximo fechamento.
    expect(result.header.closingDate).toBe('2026-08-28');
    expect(result.header.holders).toEqual(['JOSE DA SILVA', 'MARIA DA SILVA']);
    expect(result.header.cards).toEqual([
      { holder: 'JOSE DA SILVA', lastFour: '2684' },
      { holder: 'MARIA DA SILVA', lastFour: '1234' },
    ]);
  });

  it('lancamentos: pagamento fora de cartao, parcela, estorno, linhas auxiliares ignoradas', () => {
    expect(result.items).toHaveLength(6);
    const [pagto, loja, express, estorno, hinova, farmacia] = result.items;
    expect(pagto).toMatchObject({ holder_name: 'Pagamentos', card_last_four: null, transaction_date: '2026-08-05', amount: -800, description: 'PAGAMENTO EFETUADO' });
    expect(loja).toMatchObject({ holder_name: 'JOSE DA SILVA', card_last_four: '2684', transaction_date: '2026-07-31', description: 'LOJA ALFA', amount: 100, installment_current: 2, installment_total: 5 });
    expect(express).toMatchObject({ description: 'PgConta EXPRESS NETWORK', amount: 88, installment_current: null });
    expect(estorno).toMatchObject({ description: 'ESTORNO LOJA BETA', amount: -50 });
    expect(hinova).toMatchObject({ description: 'PgConta HINOVA PAY INST', amount: 127.71 });
    expect(farmacia).toMatchObject({ holder_name: 'MARIA DA SILVA', card_last_four: '1234', amount: 950 });
  });

  it('soma dos blocos fecha com o total dos lancamentos atuais', () => {
    expect(result.parsedTotal).toBe(1215.71);
    // Com mais de um cartao a fatura nao declara subtotal por cartao: nao inventa conferencia.
    expect(result.cardTotals).toEqual([]);
  });

  it('com um cartao so, o subtotal declarado e o total dos lancamentos', () => {
    const lines = faturaSintetica().filter((l) => !/MARIA|FARMACIA/.test(l.text));
    const r = parseItauFatura(lines);
    expect(r.cardTotals).toEqual([{ holder: 'JOSE DA SILVA', lastFour: '2684', declared: 1215.71, parsed: 265.71 }]);
  });

  it('ancora o ano no vencimento', () => {
    const lines = faturaSintetica().map((l) => {
      const items = l.items.map((i) => ({ ...i, text: i.text.replace('08/09/2026', '08/01/2027').replace('31/07', '31/12') }));
      return { ...l, items, text: items.map((i) => i.text).join(' ') };
    });
    const r = parseItauFatura(lines);
    expect(r.dueDate).toBe('2027-01-08');
    expect(r.items.find((i) => i.description === 'LOJA ALFA')?.transaction_date).toBe('2026-12-31');
  });

  it('sem lancamentos devolve erro', () => {
    const r = parseItauFatura(faturaSintetica().filter((l) => l.page === 1));
    expect(r.error).toMatch(/Itaú/);
  });
});
