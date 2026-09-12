import { describe, expect, it } from 'vitest';
import { parseInterFatura } from './inter';
import { detectBank } from './invoice';
import type { PdfLine } from './types';

/** Linha ja agrupada, com as coordenadas x reais da fatura do Inter (pagina 446pt de largura); dados ficticios. */
function row(page: number, ...cells: [text: string, x: number][]): PdfLine {
  const items = cells.map(([text, x]) => ({ text, x, y: 0 }));
  return { page, y: 0, items, text: items.map((i) => i.text).join(' ') };
}

// Colunas reais (pontos): data 24 | movimentacao 77 | beneficiario ~282-300 | valor ~394
const X = { date: 24, desc: 77.4, benef: 299.5, value: 394.5 };

function faturaSintetica(): PdfLine[] {
  return [
    // ---- pagina 1: resumo com colunas embaralhadas ----
    row(1, ['Resumo da fatura', 30]),
    row(1, ['Olá, Jose! A sua fatura chegou!', 30]),
    row(1, ['Limite de crédito total', 30], ['Total da sua fatura', 200]),
    row(1, ['R$ 179,00', 30]),
    row(1, ['R$ 0,00', 200]),
    row(1, ['Data de Vencimento', 300]),
    row(1, ['Este é o valor que você precisa pagar nesse mês', 30], ['25/08/2026', 330]),
    row(1, ['BENEFICIÁRIO BANCO INTER S/A CNPJ: 00.416.968\\0001-01', 30]),

    // ---- pagina 2: cabecalho (repetido em todas) e descritivo ----
    row(2, ['JOSE DA SILVA', 229.5]),
    row(2, ['5364****0257', 256.5], ['25/08/2026', 327.7], ['R $', 387], ['0 , 0 0', 401.2]),
    row(2, ['DESPESAS DO MÊS', 54.6], ['VALOR ANTECIPADO', 196.9], ['FATURA ATUAL', 346.7]),
    row(2, ['R$', 60.9], ['1.379,90', 72.9], ['R$', 204.4], ['674,37', 216.4], ['R$', 351.2], ['635,53', 363.2]),
    row(2, ['Descritivo detalhado', 30]),
    row(2, ['Despesas do mês', 30], ['R$', 387.7], ['1.379,90', 396.7]),
    row(2, ['Valor total de juros e encargos', 42], ['R$', 393.7], ['0,00', 402.7]),
    row(2, ['Valor antecipado', 30], ['R$', 386.2], ['674,37', 395.2]),
    row(2, ['Fatura atual', 30], ['R$', 393.7], ['635,53', 402.7]),

    // ---- pagina 3: lancamentos ----
    row(3, ['JOSE DA SILVA', 229.5]),
    row(3, ['5364****0257', 256.5], ['25/08/2026', 327.7], ['R $', 387], ['0 , 0 0', 401.2]),
    row(3, ['Despesas da fatura', 18]),
    row(3, ['CARTÃO', 24], ['5364****0257', 54.7]),
    row(3, ['Data', 24], ['Movimentação', 75], ['Beneficiário', 282.4], ['Valor', 404.2]),
    row(3, ['26 de jul. 2026', X.date], ['APPLE.COM/BILL', X.desc], ['-', X.benef], ['R$ 109,90', X.value]),
    // parcelada, beneficiario preenchido (nao entra na descricao)
    row(3, ['02 de ago. 2026', X.date], ['MERCADOLIVRE Parcela 02/06', X.desc], ['MERCADO LIVRE LTDA', 282], ['R$ 250,00', X.value]),
    // estorno: sinal depois do R$
    row(3, ['05 de ago. 2026', X.date], ['ESTORNO UBER', X.desc], ['-', X.benef], ['R$ -50,00', 390]),
    // dezembro do ano anterior: a data ja traz o ano
    row(3, ['30 de dez. 2025', X.date], ['LOJA BETA 03/03', X.desc], ['-', X.benef], ['R$ 1.000,00', 388]),
    row(3, ['Total CARTÃO', 24], ['5364****0257', 61.5], ['R$', 394.5], ['1.309,90', 403.5]),
    // cartao adicional em bloco proprio
    row(3, ['CARTÃO', 24], ['5364****9999', 54.7], ['MARIA DA SILVA', 120]),
    row(3, ['Data', 24], ['Movimentação', 75], ['Beneficiário', 282.4], ['Valor', 404.2]),
    row(3, ['10 de ago. 2026', X.date], ['FARMACIA GAMA', X.desc], ['-', X.benef], ['R$ 70,00', X.value]),
    row(3, ['Total CARTÃO', 24], ['5364****9999', 61.5], ['R$', 394.5], ['70,00', 403.5]),

    // ---- pagina 4: proxima fatura e limites ----
    row(4, ['JOSE DA SILVA', 229.5]),
    row(4, ['5364****0257', 256.5], ['25/08/2026', 327.7], ['R $', 387], ['0 , 0 0', 401.2]),
    row(4, ['Limite de crédito total:', 33.4], ['Próxima fatura', 237]),
    row(4, ['R$', 33.4], ['179,00', 49.1], ['Data de corte:', 237], ['18/09/2026', 285]),
    row(4, ['Utilizado:', 33.4], ['Disponível:', 90.4]),
    row(4, ['R$', 33.4], ['564,47', 45.4], ['R$', 90.4], ['-385,47', 102.4]),
    row(4, ['www.bancointer.com.br', 54]),
  ];
}

describe('parseInterFatura', () => {
  const result = parseInterFatura(faturaSintetica());

  it('e detectada como Inter', () => {
    expect(detectBank(faturaSintetica())).toBe('Inter');
  });

  it('le vencimento, total de despesas, limite e fechamento (data de corte - 1 mes)', () => {
    expect(result.error).toBeUndefined();
    expect(result.dueDate).toBe('2026-08-25');
    expect(result.totalFatura).toBe(1379.9);
    expect(result.previousBalance).toBe(0);
    expect(result.header.limit).toBe(179);
    expect(result.header.closingDate).toBe('2026-08-18');
  });

  it('cabecalho: banco, bandeira pelo BIN, final, titular e cartoes', () => {
    expect(result.header.bank).toBe('Inter');
    expect(result.header.brand).toBe('Mastercard');
    expect(result.header.lastFour).toBe('0257');
    expect(result.header.holders).toEqual(['JOSE DA SILVA', 'MARIA DA SILVA']);
    expect(result.header.cards).toEqual([
      { holder: 'JOSE DA SILVA', lastFour: '0257' },
      { holder: 'MARIA DA SILVA', lastFour: '9999' },
    ]);
  });

  it('lancamentos: data por extenso com ano, parcela, estorno, beneficiario fora da descricao', () => {
    expect(result.items).toHaveLength(5);
    const [apple, ml, estorno, beta, farmacia] = result.items;
    expect(apple).toMatchObject({ holder_name: 'JOSE DA SILVA', card_last_four: '0257', transaction_date: '2026-07-26', description: 'APPLE.COM/BILL', amount: 109.9, installment_current: null });
    expect(ml).toMatchObject({ transaction_date: '2026-08-02', description: 'MERCADOLIVRE', amount: 250, installment_current: 2, installment_total: 6 });
    expect(estorno).toMatchObject({ description: 'ESTORNO UBER', amount: -50 });
    expect(beta).toMatchObject({ transaction_date: '2025-12-30', description: 'LOJA BETA', amount: 1000, installment_current: 3, installment_total: 3 });
    expect(farmacia).toMatchObject({ holder_name: 'MARIA DA SILVA', card_last_four: '9999', amount: 70 });
  });

  it('cada bloco fecha com o "Total CARTÃO" declarado', () => {
    expect(result.cardTotals).toEqual([
      { holder: 'JOSE DA SILVA', lastFour: '0257', declared: 1309.9, parsed: 1309.9 },
      { holder: 'MARIA DA SILVA', lastFour: '9999', declared: 70, parsed: 70 },
    ]);
    expect(result.parsedTotal).toBe(1379.9);
  });

  it('sem lancamentos devolve erro', () => {
    const r = parseInterFatura(faturaSintetica().filter((l) => l.page !== 3));
    expect(r.error).toMatch(/Inter/);
  });
});
