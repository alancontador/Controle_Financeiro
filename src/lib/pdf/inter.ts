import { autoCategory } from './autoCategory';
import { addMonths } from '@/lib/dates';
import type { CardTotal, ParsedHeader, ParsedItem, ParseResult, PdfLine, PdfTextItem } from './types';

/**
 * Parser da fatura do Banco Inter (PDF baixado do Super App).
 *
 * Toda pagina repete um cabecalho: nome do titular e, na linha de baixo,
 * "5364****0257 | vencimento | R $ | 0 , 0 0" (o total vem com os digitos
 * espacados - por isso o total e lido do "Descritivo detalhado"). A pagina 2
 * traz "Despesas do mês" (o total de compras, oracle do parser). A secao
 * "Despesas da fatura" tem um bloco por cartao: "CARTÃO 5364****0257", a
 * tabela Data | Movimentação | Beneficiário | Valor e "Total CARTÃO ... R$ x".
 * Datas vem por extenso com ano ("26 de jul. 2026"); creditos como "R$ -50,00".
 * A pagina "Próxima fatura" traz "Data de corte" (o proximo fechamento) e o
 * limite total.
 */

const HOLDER_OUTSIDE_CARD = 'Pagamentos';

const COL = {
  /** A descricao fica entre a data (~24) e o beneficiario (~282). */
  descStart: 60,
  benefStart: 275,
};

const MONTHS: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};
const MONEY = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}`;
const RE_VALUE_END = new RegExp(String.raw`R\$\s*(-?)\s*(${MONEY})$`);
const RE_DATE_ITEM = /^(\d{1,2}) de ([a-z]{3})\.? (\d{4})$/i;
const RE_CARD_HEADER = /^(\d{4})\*{4}(\d{4})\s+(\d{2})\/(\d{2})\/(\d{4})/;
const RE_CARD_BLOCK = /^CART[ÃA]O\s+(\d{4})\*{4}(\d{4})(?:\s+(.+))?$/i;
const RE_CARD_TOTAL = new RegExp(String.raw`^Total CART[ÃA]O\s+\d{4}\*{4}(\d{4})\s+R\$\s*(-?)\s*(${MONEY})$`, 'i');
const RE_EXPENSES = new RegExp(String.raw`^Despesas do m[êe]s\s+R\$\s*(${MONEY})$`, 'i');
const RE_CURRENT = new RegExp(String.raw`^Fatura atual\s+R\$\s*(${MONEY})$`, 'i');
const RE_LIMIT_LABEL = /Limite de cr[ée]dito total/i;
const RE_LIMIT_VALUE = new RegExp(String.raw`R\$\s*(${MONEY})`);
const RE_CUTOFF = /Data de corte:\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const RE_DUE_LABEL = /Data de Vencimento/i;
const RE_FULL_DATE = /(\d{2})\/(\d{2})\/(\d{4})/;
const RE_INSTALLMENT = /(?:\(|\b)(?:Parcela|Parc\.?)?\s*(\d{1,2})\/(\d{1,2})\)?\s*$/i;
const RE_PAYMENT = /PAGAMENTO|PGTO/i;
const RE_UPPER_NAME = /^[A-ZÀ-Ü][A-ZÀ-Ü' ]+$/;

const parseMoney = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const round2 = (n: number) => Math.round(n * 100) / 100;
const toIso = (dd: string, mm: string, yyyy: string) => `${yyyy}-${mm}-${dd}`;
const joinText = (items: PdfTextItem[]) => items.map((i) => i.text.trim()).filter(Boolean).join(' ');

/** Bandeira pelo primeiro digito (o Inter e Mastercard, mas o numero confirma). */
function brandFromBin(first: string): string {
  switch (first[0]) {
    case '5': return 'Mastercard';
    case '4': return 'Visa';
    case '3': return 'Amex';
    case '6': return 'Elo';
    default: return 'Outro';
  }
}

interface Block {
  holder: string;
  lastFour: string;
  declared?: number;
  sum: number;
}

export function parseInterFatura(lines: PdfLine[], today: Date = new Date()): ParseResult {
  void today; // as datas do Inter ja trazem o ano
  const header: ParsedHeader = { bank: 'Inter', brand: 'Mastercard', holders: [], cards: [] };
  const items: ParsedItem[] = [];
  let totalFatura: number | undefined;
  let totalToPay: number | undefined;
  let dueDate: string | undefined;
  let cutoff: string | undefined;
  let titular: string | undefined;

  const blocks: Block[] = [];
  let current: Block | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const text = line.text.trim();

    // ---- cabecalho repetido: "5364****0257 25/08/2026 ..." logo abaixo do nome ----
    const ch = text.match(RE_CARD_HEADER);
    if (ch) {
      if (!header.lastFour) {
        header.lastFour = ch[2];
        header.brand = brandFromBin(ch[1]);
        dueDate = dueDate ?? toIso(ch[3], ch[4], ch[5]);
      }
      if (!titular) {
        const prev = lines[idx - 1];
        if (prev && prev.page === line.page && RE_UPPER_NAME.test(prev.text.trim())) titular = prev.text.trim();
      }
      continue;
    }
    if (!dueDate && RE_DUE_LABEL.test(text)) {
      for (let j = idx + 1; j <= idx + 2 && j < lines.length && !dueDate; j++) {
        const m = lines[j].text.match(RE_FULL_DATE);
        if (m) dueDate = toIso(m[1], m[2], m[3]);
      }
    }
    if (header.limit === undefined && RE_LIMIT_LABEL.test(text)) {
      // O valor fica na linha de baixo (ou na mesma, se a coluna vier junta).
      for (let j = idx; j <= idx + 2 && j < lines.length; j++) {
        const m = lines[j].text.match(RE_LIMIT_VALUE);
        if (m) { header.limit = parseMoney(m[1]); break; }
      }
    }
    if (!cutoff) {
      const m = text.match(RE_CUTOFF);
      if (m) cutoff = toIso(m[1], m[2], m[3]);
    }
    const exp = text.match(RE_EXPENSES);
    if (exp) { totalFatura = parseMoney(exp[1]); continue; }
    const cur = text.match(RE_CURRENT);
    if (cur) { totalToPay = parseMoney(cur[1]); continue; }

    // ---- blocos de cartao ----
    const block = text.match(RE_CARD_BLOCK);
    if (block) {
      const holder = block[3]?.trim() || titular || '';
      current = { holder, lastFour: block[2], sum: 0 };
      blocks.push(current);
      continue;
    }
    const total = text.match(RE_CARD_TOTAL);
    if (total) {
      const b = blocks.find((x) => x.lastFour === total[1]) ?? current;
      if (b) b.declared = parseMoney(total[3]) * (total[2] ? -1 : 1);
      current = null;
      continue;
    }

    // ---- lancamento: data por extenso | descricao | beneficiario | R$ valor ----
    const first = line.items[0];
    if (!first) continue;
    const dateM = first.text.trim().match(RE_DATE_ITEM);
    if (!dateM) continue;
    const mm = MONTHS[dateM[2].toLowerCase()];
    if (!mm) continue;
    const valueM = text.match(RE_VALUE_END);
    if (!valueM) continue;
    const amount = parseMoney(valueM[2]) * (valueM[1] ? -1 : 1);

    let description = joinText(line.items.filter((i) => i !== first && i.x >= COL.descStart && i.x < COL.benefStart));
    if (!description) continue;
    let installment: { current: number; total: number } | undefined;
    const inst = description.match(RE_INSTALLMENT);
    if (inst) {
      const c = Number(inst[1]);
      const t = Number(inst[2]);
      if (c >= 1 && c <= t && t <= 99) {
        installment = { current: c, total: t };
        description = description.slice(0, inst.index).replace(/[-(]\s*$/, '').trim();
      }
    }
    description = description.replace(/\s+/g, ' ').trim();
    if (!description) continue;

    const isPayment = RE_PAYMENT.test(description) && amount < 0;
    const holder = isPayment ? HOLDER_OUTSIDE_CARD : current?.holder || titular || '';
    const lastFour = isPayment ? null : current?.lastFour ?? header.lastFour ?? null;
    items.push({
      holder_name: holder,
      card_last_four: lastFour,
      transaction_date: toIso(dateM[1].padStart(2, '0'), mm, dateM[3]),
      description,
      amount,
      category: autoCategory(description),
      installment_current: installment?.current ?? null,
      installment_total: installment?.total ?? null,
    });
    if (!isPayment && current) current.sum += amount;
  }

  header.closingDate = cutoff ? addMonths(cutoff, -1) : undefined;
  if (titular) header.holders.push(titular);
  for (const b of blocks) {
    if (b.holder && !header.holders.includes(b.holder)) header.holders.push(b.holder);
    if (!header.cards.some((c) => c.lastFour === b.lastFour)) header.cards.push({ holder: b.holder, lastFour: b.lastFour });
  }
  if (header.lastFour && !header.cards.some((c) => c.lastFour === header.lastFour) && titular) {
    header.cards.unshift({ holder: titular, lastFour: header.lastFour });
  }

  const cardTotals: CardTotal[] = blocks
    .filter((b) => b.declared !== undefined)
    .map((b) => ({ holder: b.holder, lastFour: b.lastFour, declared: b.declared!, parsed: round2(b.sum) }));
  const parsedTotal = round2(blocks.reduce((s, b) => s + b.sum, 0));

  if (items.length === 0) {
    return {
      header,
      items,
      previousBalance: 0,
      cardTotals,
      parsedTotal: 0,
      error: 'Não foi possível identificar lançamentos no PDF. Verifique se é a fatura do cartão Inter baixada pelo Super App.',
    };
  }

  return {
    header,
    items,
    previousBalance: 0,
    totalFatura: totalFatura ?? totalToPay,
    dueDate,
    cardTotals,
    parsedTotal,
  };
}
