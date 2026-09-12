import { describe, expect, it } from 'vitest';
import { parseNubankFatura } from './nubank';
import type { PdfLine } from './types';

/**
 * Monta uma linha ja agrupada, com as coordenadas x que o pdf.js devolve para a
 * fatura do Nubank. Os dados sao ficticios; so a geometria e a real.
 */
function row(page: number, ...cells: [text: string, x: number][]): PdfLine {
  const items = cells.map(([text, x]) => ({ text, x, y: 0 }));
  return { page, y: 0, items, text: items.map((i) => i.text).join(' ') };
}

// Colunas reais (em pontos): data 123 | "•••• 1234" 172 | descricao 214 (185 sem cartao) | valor encostado a direita ~490-535
const X = { block: 119, date: 123, card: 172, desc: 214, descNoCard: 185, value: 500 };

function faturaSintetica(): PdfLine[] {
  return [
    // ---- pagina 1: capa ----
    row(1, ['Olá, Ana.', 138]),
    row(1, ['Esta é a sua fatura de', 138]),
    row(1, ['setembro, no valor de', 138]),
    row(1, ['R$ 1.083,94', 138]),
    row(1, ['Data de vencimento: 09 SET 2026', 138]),
    row(1, ['Período vigente: 02 AGO a 02 SET', 138]),
    row(1, ['Limite total do cartão de crédito: R$ 13.900,00', 138]),
    row(1, ['1 de 5', 493]),

    // ---- pagina 2: cabecalho repetido + boilerplate ----
    row(2, ['ANA CLARA SILVA', 327]),
    row(2, ['FATURA 09 SET 2026', 327], ['EMISSÃO E ENVIO 02 SET 2026', 441.7]),
    row(2, ['Nu Pagamentos S.A. - Instituição de Pagamento', 58]),

    // ---- pagina 4: resumo ----
    row(4, ['ANA CLARA SILVA', 327]),
    row(4, ['FATURA 09 SET 2026', 327], ['EMISSÃO E ENVIO 02 SET 2026', 441.7]),
    row(4, ['RESUMO DA FATURA ATUAL', 50]),
    row(4, ['Fatura anterior', 140], ['R$ 1.148,40', 489]),
    row(4, ['Pagamento recebido', 140], ['−R$ 1.148,40', 483.8]),
    row(4, ['Total de compras de todos os cartões, 02 AGO a 02 SET', 140], ['R$ 1.083,94', 486.9]),
    row(4, ['Total a pagar', 140], ['R$ 1.083,94', 455.2]),
    row(4, ['Pagamento mínimo para não ficar em atraso', 140], ['R$ 162,59', 506.4]),
    row(4, ['PRÓXIMAS FATURAS', 50]),
    row(4, ['Fechamento da próxima fatura', 140], ['02 OUT 2026', 480.6]),
    row(4, ['Limite total', 140], ['R$ 4.427,39', 395.8], ['R$ 13.900,00', 478.7]),

    // ---- pagina 5: transacoes ----
    row(5, ['ANA CLARA SILVA', 327]),
    row(5, ['FATURA 09 SET 2026', 327], ['EMISSÃO E ENVIO 02 SET 2026', 441.7]),
    row(5, ['TRANSAÇÕES', 50], ['DE 02 AGO A 02 SET', 130]),
    // bloco da titular: nome abreviado, total do bloco a direita
    row(5, ['Ana C Silva', X.block], ['R$ 1.083,94', 490.1]),
    row(5, ['02 AGO', X.date], ['•••• 0691', X.card], ['Mercadolivre*Carrefou - Parcela 3/5', X.desc], ['R$ 98,05', 500.6]),
    // compra NuPay: sem cartao fisico -> vai para o cartao principal do bloco
    row(5, ['02 AGO', X.date], ['Pichau Informatica - NuPay - Parcela 7/12', X.descNoCard], ['R$ 225,49', 497.1]),
    row(5, ['02 AGO', X.date], ['•••• 0691', X.card], ['Primaveras Convenios - Parcela 3/4', X.desc], ['R$ 232,50', 496.7]),
    row(5, ['02 AGO', X.date], ['Decolar C - NuPay - Parcela 4/12', X.descNoCard], ['R$ 223,44', 497]),
    // cartao virtual da mesma pessoa e um estorno (credito)
    row(5, ['25 AGO', X.date], ['•••• 0691', X.card], ['Tokio Marine*Auto05d12', X.desc], ['R$ 304,46', 495.5]),
    row(5, ['26 AGO', X.date], ['•••• 4321', X.card], ['Ifood *Ifd', X.desc], ['R$ 50,00', 500]),
    row(5, ['27 AGO', X.date], ['•••• 4321', X.card], ['Estorno Ifood', X.desc], ['−R$ 50,00', 495]),
    // bloco de cartao adicional (outra pessoa)
    row(5, ['Bruno Costa', X.block], ['R$ 100,00', 490.1]),
    row(5, ['28 AGO', X.date], ['•••• 7777', X.card], ['Padaria Central', X.desc], ['R$ 100,00', 500]),
    // pagamentos
    row(5, ['Pagamentos', X.block], ['-R$ 1.148,40', 489.1]),
    row(5, ['06 AGO', X.date], ['Pagamento em 06 AGO', X.descNoCard], ['−R$ 1.148,40', 487.6]),
    row(5, ['Em cumprimento à regulação do Banco Central, as suas operações de crédito...', 58]),
    row(5, ['5 de 5', 528]),
  ];
}

describe('parseNubankFatura', () => {
  const result = parseNubankFatura(faturaSintetica());

  it('le capa e resumo: vencimento, total de compras, saldo anterior, limite', () => {
    expect(result.error).toBeUndefined();
    expect(result.dueDate).toBe('2026-09-09');
    expect(result.totalFatura).toBe(1083.94);
    expect(result.previousBalance).toBe(1148.4);
    expect(result.header.limit).toBe(13900);
  });

  it('le o cabecalho: banco, bandeira, fechamento (emissao), titular completo e cartoes', () => {
    expect(result.header.bank).toBe('Nubank');
    expect(result.header.brand).toBe('Mastercard');
    expect(result.header.closingDate).toBe('2026-09-02');
    expect(result.header.lastFour).toBe('0691');
    // O bloco traz o nome abreviado ("Ana C Silva"); o cabecalho tem o nome completo. Usa o completo.
    expect(result.header.holders).toEqual(['ANA CLARA SILVA', 'Bruno Costa']);
    expect(result.header.cards).toEqual([
      { holder: 'ANA CLARA SILVA', lastFour: '0691' },
      { holder: 'ANA CLARA SILVA', lastFour: '4321' },
      { holder: 'Bruno Costa', lastFour: '7777' },
    ]);
  });

  it('cada lancamento tem data com ano, cartao, parcela e sinal certos', () => {
    const [ml, pichau, prim, decolar, tokio, ifood, estorno, padaria, pagto] = result.items;
    expect(ml).toMatchObject({ transaction_date: '2026-08-02', card_last_four: '0691', description: 'Mercadolivre*Carrefou', amount: 98.05, installment_current: 3, installment_total: 5, holder_name: 'ANA CLARA SILVA' });
    expect(pichau).toMatchObject({ card_last_four: '0691', description: 'Pichau Informatica - NuPay', amount: 225.49, installment_current: 7, installment_total: 12 });
    expect(prim).toMatchObject({ description: 'Primaveras Convenios', installment_current: 3, installment_total: 4 });
    expect(decolar).toMatchObject({ card_last_four: '0691', description: 'Decolar C - NuPay', installment_current: 4, installment_total: 12 });
    expect(tokio).toMatchObject({ transaction_date: '2026-08-25', description: 'Tokio Marine*Auto05d12', amount: 304.46, installment_current: null, installment_total: null });
    expect(ifood).toMatchObject({ card_last_four: '4321', amount: 50 });
    expect(estorno).toMatchObject({ card_last_four: '4321', amount: -50, description: 'Estorno Ifood' });
    expect(padaria).toMatchObject({ holder_name: 'Bruno Costa', card_last_four: '7777', amount: 100 });
    expect(pagto).toMatchObject({ holder_name: 'Pagamentos', card_last_four: null, transaction_date: '2026-08-06', amount: -1148.4, description: 'Pagamento em 06 AGO' });
    expect(result.items).toHaveLength(9);
  });

  it('confere os blocos com os subtotais declarados e o total de compras', () => {
    expect(result.cardTotals).toEqual([
      { holder: 'ANA CLARA SILVA', lastFour: '0691', declared: 1083.94, parsed: 1083.94 },
      { holder: 'Bruno Costa', lastFour: '7777', declared: 100, parsed: 100 },
    ]);
    expect(result.parsedTotal).toBe(1183.94);
  });

  it('ancora o ano no vencimento: fatura de janeiro tem compras de dezembro do ano anterior', () => {
    const lines = faturaSintetica().map((l) => {
      const items = l.items.map((i) => ({ ...i, text: i.text.replace('09 SET 2026', '09 JAN 2027').replace('25 AGO', '25 DEZ') }));
      return { ...l, items, text: items.map((i) => i.text).join(' ') };
    });
    const r = parseNubankFatura(lines);
    expect(r.dueDate).toBe('2027-01-09');
    expect(r.items.find((i) => i.description.startsWith('Tokio'))?.transaction_date).toBe('2026-12-25');
  });

  it('sem lancamentos devolve erro', () => {
    const r = parseNubankFatura(faturaSintetica().filter((l) => l.page !== 5));
    expect(r.error).toMatch(/Nubank/);
    expect(r.items).toHaveLength(0);
  });
});
