import { autoCategory } from './autoCategory';
import { addMonths } from '@/lib/dates';
import type { CardTotal, ParsedHeader, ParsedItem, ParseResult, PdfLine, PdfTextItem } from './types';

/**
 * Parser da fatura do Itaú Cartões (PDF baixado do app/site, layout com o
 * boleto na pagina 1).
 *
 * Pagina 1: titular, "Cartão 4480.XXXX.XXXX.2684", vencimento, emissao,
 * previsao do proximo fechamento, limite e o "Resumo da fatura" (fatura
 * anterior, pagamentos, lancamentos atuais, total desta fatura).
 * Pagina 2+: coluna da esquerda com as secoes "Lançamentos: ..." (DATA |
 * PRODUTOS/SERVIÇOS | VALOR EM R$) e, a direita, avisos e simulacoes que ficam
 * na mesma altura - por isso o corte por x. Linhas sem data ("Principal (R$
 * ...) + Juros (R$ ...)", subtotais) nao sao lancamentos.
 */

/** Titular atribuido a pagamentos da fatura (nao sao compra de ninguem). */
const HOLDER_OUTSIDE_CARD = 'Pagamentos';

const COL = {
  /** A coluna da direita (avisos) comeca em ~350; o valor termina em ~331. */
  valueEnd: 340,
};

const MONEY = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}`;
const RE_MONEY_END = new RegExp(String.raw`(-?)\s*(${MONEY})\s*(-?)$`);
const RE_DUE = /Vencimento:\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const RE_ISSUE = /Emiss[ãa]o:\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const RE_NEXT_CLOSING = /Previs[ãa]o (?:pr[óo]x\.|para o pr[óo]ximo) [Ff]echamento:?\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const RE_HOLDER = /^Titular\s+(.+)$/i;
const RE_CARD = /^Cart[ãa]o\s+(\d{4})\.X{4}\.X{4}\.(\d{4})/i;
const RE_LIMIT = new RegExp(String.raw`Limite total de cr[ée]dito:?\s*(?:R\$\s*)?(${MONEY})`, 'i');
// Na pagina 1 as linhas do resumo vem com a letra do indicador na frente ("P", "S", "L", "=").
const RE_PREVIOUS = new RegExp(String.raw`(?:^|\s)Total da fatura anterior\s+(${MONEY})`, 'i');
const RE_CURRENT = new RegExp(String.raw`(?:^|\s)(?:Lan[çc]amentos atuais|Total dos lan[çc]amentos atuais)\s+(${MONEY})`, 'i');
const RE_TOTAL = new RegExp(String.raw`(?:^|\s)Total desta fatura\s+(${MONEY})`, 'i');
const RE_SECTION = /^Lan[çc]amentos[:\s]/i;
const RE_COLUMNS = /^DATA\s+PRODUTOS/i;
/** Bloco de cartao adicional: "NOME ... final 1234" (na ordem em que o Itaú imprime). */
const RE_CARD_BLOCK = /^(.+?)\s+(?:cart[ãa]o\s+)?final\s+(\d{4})\s*$/i;
const RE_DATE_ITEM = /^(\d{2})\/(\d{2})$/;
const RE_INSTALLMENT = /(\d{2})\/(\d{2})(?=\s|$)/;
const RE_PAYMENT = /PAGAMENTO|PGTO/i;
const RE_LEVEL = /^(Platinum|Gold|Black|Infinite|Internacional|Nacional|Uniclass|Personnalit[ée])$/i;

const parseMoney = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const round2 = (n: number) => Math.round(n * 100) / 100;
const toIso = (dd: string, mm: string, yyyy: string) => `${yyyy}-${mm}-${dd}`;
const joinText = (items: PdfTextItem[]) => items.map((i) => i.text.trim()).filter(Boolean).join(' ');

/** Bandeira pelo primeiro digito do numero (o PDF nao escreve a bandeira). */
function brandFromBin(first: string): string {
  switch (first[0]) {
    case '4': return 'Visa';
    case '5': return 'Mastercard';
    case '3': return 'Amex';
    case '6': return 'Elo';
    default: return 'Outro';
  }
}

export function parseItauFatura(lines: PdfLine[], today: Date = new Date()): ParseResult {
  const header: ParsedHeader = { bank: 'Itaú', brand: 'Outro', holders: [], cards: [] };
  const items: ParsedItem[] = [];
  let previousBalance = 0;
  let totalFatura: number | undefined;
  let totalToPay: number | undefined;
  let dueDate: string | undefined;
  let issueDate: string | undefined;
  let nextClosing: string | undefined;
  let level: string | undefined;

  let inTransactions = false;
  let currentHolder: string | undefined;
  let currentLastFour: string | undefined;
  const blockSums = new Map<string, { holder: string; lastFour: string; sum: number }>();

  const yearFor = (month: number): number => {
    const [refYear, refMonth] = dueDate
      ? [Number(dueDate.slice(0, 4)), Number(dueDate.slice(5, 7))]
      : [today.getFullYear(), today.getMonth() + 1];
    return month > refMonth ? refYear - 1 : refYear;
  };

  for (const line of lines) {
    const text = line.text.trim();

    // ---- pagina 1: cabecalho e resumo ----
    if (!level && line.page === 1) {
      const lv = line.items.find((i) => RE_LEVEL.test(i.text.trim()));
      if (lv) level = lv.text.trim();
    }
    if (!dueDate) {
      const m = text.match(RE_DUE);
      if (m) dueDate = toIso(m[1], m[2], m[3]);
    }
    if (!issueDate) {
      const m = text.match(RE_ISSUE);
      if (m) issueDate = toIso(m[1], m[2], m[3]);
    }
    if (!nextClosing) {
      const m = text.match(RE_NEXT_CLOSING);
      if (m) nextClosing = toIso(m[1], m[2], m[3]);
    }
    if (header.holders.length === 0) {
      const m = text.match(RE_HOLDER);
      if (m) { header.holders.push(m[1].trim()); continue; }
    }
    if (!header.lastFour) {
      const m = text.match(RE_CARD);
      if (m) {
        header.lastFour = m[2];
        header.brand = brandFromBin(m[1]);
        continue;
      }
    }
    if (header.limit === undefined) {
      const m = text.match(RE_LIMIT);
      if (m) { header.limit = parseMoney(m[1]); continue; }
    }
    const prev = text.match(RE_PREVIOUS);
    if (prev) { previousBalance = parseMoney(prev[1]); continue; }
    const cur = text.match(RE_CURRENT);
    if (cur) { totalFatura = parseMoney(cur[1]); continue; }
    const tot = text.match(RE_TOTAL);
    if (tot) { totalToPay = parseMoney(tot[1]); continue; }

    // ---- lancamentos (coluna da esquerda das paginas seguintes) ----
    const left = line.items.filter((i) => i.x < COL.valueEnd);
    const leftText = joinText(left);
    if (RE_SECTION.test(leftText) || RE_COLUMNS.test(leftText)) { inTransactions = true; continue; }
    if (!inTransactions) continue;

    const block = leftText.match(RE_CARD_BLOCK);
    if (block && !RE_DATE_ITEM.test(left[0]?.text.trim() ?? '')) {
      currentHolder = block[1].trim();
      currentLastFour = block[2];
      if (!header.holders.includes(currentHolder)) header.holders.push(currentHolder);
      continue;
    }

    const first = left[0];
    if (!first) continue;
    const dateM = first.text.trim().match(RE_DATE_ITEM);
    if (!dateM) continue;
    const rest = joinText(left.slice(1));
    const m = rest.match(RE_MONEY_END);
    if (!m) continue;
    const amount = parseMoney(m[2]) * (m[1] || m[3] ? -1 : 1);
    let description = rest.slice(0, m.index).replace(/\s+/g, ' ').trim();
    if (!description) continue;

    let installment: { current: number; total: number } | undefined;
    const inst = description.match(RE_INSTALLMENT);
    if (inst) {
      const c = Number(inst[1]);
      const t = Number(inst[2]);
      if (c >= 1 && c <= t && t <= 99) {
        installment = { current: c, total: t };
        description = description.replace(inst[0], '').replace(/\s+/g, ' ').trim();
      }
    }

    const [, dd, mm] = dateM;
    const isPayment = RE_PAYMENT.test(description) && amount < 0;
    const holder = isPayment ? HOLDER_OUTSIDE_CARD : currentHolder ?? header.holders[0] ?? '';
    const lastFour = isPayment ? null : currentLastFour ?? header.lastFour ?? null;
    items.push({
      holder_name: holder,
      card_last_four: lastFour,
      transaction_date: `${yearFor(Number(mm))}-${mm}-${dd}`,
      description,
      amount,
      category: autoCategory(description),
      installment_current: installment?.current ?? null,
      installment_total: installment?.total ?? null,
    });
    if (!isPayment && lastFour) {
      const key = `${holder}|${lastFour}`;
      const b = blockSums.get(key) ?? { holder, lastFour, sum: 0 };
      b.sum += amount;
      blockSums.set(key, b);
    }
  }

  // Fechamento: um mes antes da previsao do proximo; senao, a emissao.
  header.closingDate = nextClosing ? addMonths(nextClosing, -1) : issueDate;
  if (level) header.brandLabel = header.brand === 'Outro' ? level : `${header.brand} ${level}`;

  // Cartoes: o principal do cabecalho primeiro, depois os blocos na ordem em que apareceram.
  if (header.lastFour && header.holders[0]) header.cards.push({ holder: header.holders[0], lastFour: header.lastFour });
  for (const b of blockSums.values()) {
    if (!header.cards.some((c) => c.lastFour === b.lastFour)) header.cards.push({ holder: b.holder, lastFour: b.lastFour });
  }

  const parsedTotal = round2([...blockSums.values()].reduce((s, b) => s + b.sum, 0));
  // So ha subtotal declarado por cartao quando a fatura tem um cartao so: e o total dos lancamentos.
  const cardTotals: CardTotal[] = [];
  if (blockSums.size === 1 && totalFatura !== undefined) {
    const b = [...blockSums.values()][0];
    cardTotals.push({ holder: b.holder, lastFour: b.lastFour, declared: totalFatura, parsed: round2(b.sum) });
  }

  if (items.length === 0) {
    return {
      header,
      items,
      previousBalance,
      cardTotals,
      parsedTotal: 0,
      error: 'Não foi possível identificar lançamentos no PDF. Verifique se é a fatura do cartão Itaú baixada pelo app ou site.',
    };
  }

  return {
    header,
    items,
    previousBalance,
    totalFatura: totalFatura ?? totalToPay,
    dueDate,
    cardTotals,
    parsedTotal,
  };
}
