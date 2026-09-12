import { autoCategory } from './autoCategory';
import { addMonths } from '@/lib/dates';
import type { CardTotal, ParsedHeader, ParsedItem, ParseResult, PdfLine } from './types';

/**
 * Parser da fatura do Nubank (PDF baixado do app).
 *
 * Layout: capa (vencimento, periodo, limite), paginas de aviso, "Resumo da
 * fatura atual" (fatura anterior, pagamento recebido, total de compras) e a
 * secao "Transacoes", que vem em blocos por pessoa: uma linha com o nome
 * abreviado e o subtotal, depois os lancamentos "DD MMM | •••• 1234 | descricao
 * - Parcela X/Y | R$ valor". Compras via NuPay nao trazem numero de cartao.
 * O bloco "Pagamentos" fecha a secao. Creditos vem com sinal de menos (U+2212
 * ou hifen) antes de "R$".
 */

/** Titular atribuido a lancamentos fora de bloco de pessoa (pagamentos da fatura). */
const HOLDER_OUTSIDE_CARD = 'Pagamentos';

const MONTHS: Record<string, string> = {
  JAN: '01', FEV: '02', MAR: '03', ABR: '04', MAI: '05', JUN: '06', JUL: '07', AGO: '08', SET: '09', OUT: '10', NOV: '11', DEZ: '12',
};
const MONTH = String.raw`(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)`;
const MONEY = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}`;
const RE_MONEY_ITEM = new RegExp(String.raw`^([−–-])?\s*R\$\s*(${MONEY})$`);
const RE_DUE = new RegExp(String.raw`Data de vencimento:\s*(\d{2})\s+${MONTH}\s+(\d{4})`, 'i');
const RE_ISSUE = new RegExp(String.raw`EMISS[ÃA]O E ENVIO\s+(\d{2})\s+${MONTH}\s+(\d{4})`, 'i');
const RE_INVOICE_HEADER = new RegExp(String.raw`^FATURA\s+\d{2}\s+${MONTH}\s+\d{4}`, 'i');
const RE_NEXT_CLOSING = new RegExp(String.raw`Fechamento da pr[óo]xima fatura\s+(\d{2})\s+${MONTH}\s+(\d{4})`, 'i');
const RE_LIMIT = new RegExp(String.raw`Limite total do cart[ãa]o de cr[ée]dito:\s*R\$\s*(${MONEY})`, 'i');
const RE_PREVIOUS = new RegExp(String.raw`^Fatura anterior\s+R\$\s*(${MONEY})`, 'i');
const RE_TOTAL_PURCHASES = new RegExp(String.raw`^Total de compras de todos os cart[õo]es.*?R\$\s*(${MONEY})`, 'i');
const RE_COVER_TOTAL = new RegExp(String.raw`^R\$\s*(${MONEY})$`);
const RE_TRANSACTIONS = /^TRANSA[ÇC][ÕO]ES\b/i;
const RE_DATE_ITEM = new RegExp(String.raw`^(\d{2})\s+${MONTH}$`, 'i');
const RE_CARD_ITEM = /^[•·*]+\s*(\d{4})$/;
const RE_INSTALLMENT = /\s*-?\s*Parcela\s+(\d{1,2})\/(\d{1,2})\s*$/i;
const RE_UPPER_NAME = /^[A-ZÀ-Ü][A-ZÀ-Ü' ]+$/;

const parseMoney = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const round2 = (n: number) => Math.round(n * 100) / 100;
const toIso = (dd: string, mon: string, yyyy: string) => `${yyyy}-${MONTHS[mon.toUpperCase()]}-${dd}`;

/** "Ana C Silva" bate com "ANA CLARA SILVA": mesmas iniciais, primeiro e ultimo nomes iguais. */
export function abbreviatedNameMatches(short: string, full: string): boolean {
  const a = short.trim().toUpperCase().split(/\s+/);
  const b = full.trim().toUpperCase().split(/\s+/);
  if (a.length === 0 || b.length === 0) return false;
  if (a[0] !== b[0] || a[a.length - 1] !== b[b.length - 1]) return false;
  const midA = a.slice(1, -1);
  const midB = b.slice(1, -1);
  if (midA.length > midB.length) return false;
  // Cada nome do meio abreviado tem que ser prefixo de algum nome do meio completo, na ordem.
  let j = 0;
  for (const part of midA) {
    while (j < midB.length && !midB[j].startsWith(part)) j++;
    if (j >= midB.length) return false;
    j++;
  }
  return true;
}

interface Block {
  holder: string;
  declared: number;
  items: ParsedItem[];
}

export function parseNubankFatura(lines: PdfLine[], today: Date = new Date()): ParseResult {
  const header: ParsedHeader = { bank: 'Nubank', brand: 'Mastercard', holders: [], cards: [] };
  let dueDate: string | undefined;
  let coverTotal: number | undefined;
  let totalFatura: number | undefined;
  let previousBalance = 0;
  let nextClosing: string | undefined;
  let fullName: string | undefined;

  const blocks: Block[] = [];
  let current: Block | null = null;
  let inTransactions = false;

  const yearFor = (month: number): number => {
    const [refYear, refMonth] = dueDate
      ? [Number(dueDate.slice(0, 4)), Number(dueDate.slice(5, 7))]
      : [today.getFullYear(), today.getMonth() + 1];
    return month > refMonth ? refYear - 1 : refYear;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const text = line.text.trim();
    const cells = line.items.map((i) => i.text.trim()).filter(Boolean);

    // ---- capa ----
    if (!dueDate) {
      const m = text.match(RE_DUE);
      if (m) { dueDate = toIso(m[1], m[2], m[3]); continue; }
    }
    if (coverTotal === undefined && line.page === 1) {
      const m = text.match(RE_COVER_TOTAL);
      if (m) { coverTotal = parseMoney(m[1]); continue; }
    }
    if (header.limit === undefined) {
      const m = text.match(RE_LIMIT);
      if (m) { header.limit = parseMoney(m[1]); continue; }
    }

    // ---- cabecalho das paginas internas: nome completo em cima de "FATURA dd MMM aaaa" ----
    if (RE_INVOICE_HEADER.test(text)) {
      if (!header.closingDate) {
        const m = text.match(RE_ISSUE);
        if (m) header.closingDate = toIso(m[1], m[2], m[3]);
      }
      if (!fullName) {
        const prev = lines[idx - 1];
        if (prev && prev.page === line.page && RE_UPPER_NAME.test(prev.text.trim())) fullName = prev.text.trim();
      }
      continue;
    }

    // ---- resumo ----
    const prevM = text.match(RE_PREVIOUS);
    if (prevM) { previousBalance = parseMoney(prevM[1]); continue; }
    const totM = text.match(RE_TOTAL_PURCHASES);
    if (totM) { totalFatura = parseMoney(totM[1]); continue; }
    if (!nextClosing) {
      const m = text.match(RE_NEXT_CLOSING);
      if (m) { nextClosing = toIso(m[1], m[2], m[3]); continue; }
    }

    // ---- transacoes ----
    if (RE_TRANSACTIONS.test(text)) { inTransactions = true; continue; }
    if (!inTransactions || cells.length < 2) continue;

    const last = cells[cells.length - 1].match(RE_MONEY_ITEM);
    if (!last) continue;
    const amount = parseMoney(last[2]) * (last[1] ? -1 : 1);

    const dateM = cells[0].match(RE_DATE_ITEM);
    if (!dateM) {
      // Linha "Nome R$ subtotal": abre um bloco de pessoa (ou o de pagamentos).
      if (cells.length === 2 && line.items[0].x < 160) {
        current = { holder: cells[0], declared: amount, items: [] };
        blocks.push(current);
      }
      continue;
    }

    // Lancamento: data | [•••• 1234] | descricao | valor
    let lastFour: string | null = null;
    const middle = cells.slice(1, -1);
    if (middle.length > 0 && RE_CARD_ITEM.test(middle[0])) {
      lastFour = middle[0].match(RE_CARD_ITEM)![1];
      middle.shift();
    }
    let description = middle.join(' ').replace(/\s+/g, ' ').trim();
    if (!description) continue;

    let installment: { current: number; total: number } | undefined;
    const inst = description.match(RE_INSTALLMENT);
    if (inst) {
      const cur = Number(inst[1]);
      const tot = Number(inst[2]);
      if (cur >= 1 && cur <= tot) {
        installment = { current: cur, total: tot };
        description = description.slice(0, inst.index).trim();
      }
    }

    if (!current) {
      current = { holder: HOLDER_OUTSIDE_CARD, declared: 0, items: [] };
      blocks.push(current);
    }
    const [, dd, mon] = dateM;
    const mm = MONTHS[mon.toUpperCase()];
    current.items.push({
      holder_name: current.holder,
      card_last_four: lastFour,
      transaction_date: `${yearFor(Number(mm))}-${mm}-${dd}`,
      description,
      amount,
      category: autoCategory(description),
      installment_current: installment?.current ?? null,
      installment_total: installment?.total ?? null,
    });
  }

  if (!header.closingDate && nextClosing) header.closingDate = addMonths(nextClosing, -1);

  // ---- consolida blocos: nome completo, cartao principal por pessoa, compras sem cartao ----
  const items: ParsedItem[] = [];
  const cardTotals: CardTotal[] = [];
  let parsedTotal = 0;

  for (const block of blocks) {
    const isPayments = /^Pagamentos?$/i.test(block.holder);
    const holder = isPayments
      ? HOLDER_OUTSIDE_CARD
      : fullName && abbreviatedNameMatches(block.holder, fullName) ? fullName : block.holder;

    if (isPayments) {
      for (const it of block.items) items.push({ ...it, holder_name: holder, card_last_four: null });
      continue;
    }

    // Cartao principal do bloco: o numero mais frequente. Compras sem numero (NuPay) vao para ele.
    const freq = new Map<string, number>();
    for (const it of block.items) if (it.card_last_four) freq.set(it.card_last_four, (freq.get(it.card_last_four) ?? 0) + 1);
    const main = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? header.lastFour ?? '';

    if (!header.holders.includes(holder)) header.holders.push(holder);
    const seen = new Set<string>();
    for (const it of block.items) {
      const lastFour = it.card_last_four ?? (main || null);
      if (lastFour && !seen.has(lastFour)) {
        seen.add(lastFour);
        header.cards.push({ holder, lastFour });
      }
      items.push({ ...it, holder_name: holder, card_last_four: lastFour });
    }
    // Cartao principal da fatura: o principal da pessoa do cabecalho (ou do primeiro bloco).
    if (main && (!header.lastFour || holder === fullName)) header.lastFour = main;

    const parsed = round2(block.items.reduce((s, it) => s + it.amount, 0));
    parsedTotal += parsed;
    cardTotals.push({ holder, lastFour: main, declared: block.declared, parsed });
  }

  // O cartao principal tem que vir antes dos outros da mesma pessoa, para a classificacao.
  if (header.lastFour) {
    const i = header.cards.findIndex((c) => c.lastFour === header.lastFour);
    if (i > 0) header.cards.unshift(...header.cards.splice(i, 1));
  }

  if (items.length === 0) {
    return {
      header,
      items,
      previousBalance,
      cardTotals,
      parsedTotal: 0,
      error: 'Não foi possível identificar lançamentos no PDF. Verifique se é a fatura do cartão Nubank baixada pelo app.',
    };
  }

  return {
    header,
    items,
    previousBalance,
    totalFatura: totalFatura ?? coverTotal,
    dueDate,
    cardTotals,
    parsedTotal: round2(parsedTotal),
  };
}
