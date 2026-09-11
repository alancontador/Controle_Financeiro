import { autoCategory } from './autoCategory';
import type { PdfLine, PdfTextItem } from './types';

/**
 * Parser da "Fatura Mensal" do Bradesco Cartoes (PDF baixado do app/site).
 *
 * A fatura tem duas colunas: os lancamentos a esquerda e, a direita, limites,
 * taxas e avisos que ficam na mesma altura e por isso "vazam" para dentro das
 * linhas de lancamento quando o texto e lido de forma ingenua. Por isso o
 * parser trabalha com a geometria (coordenada x de cada trecho) em vez de so
 * com o texto: tudo que esta a direita da coluna de valor R$ e descartado.
 */

export interface BradescoItem {
  holder_name: string;
  /** Data ISO (aaaa-mm-dd). */
  transaction_date: string;
  description: string;
  /** Negativo para creditos (pagamentos, estornos). */
  amount: number;
  category: string;
  installment_current: number | null;
  installment_total: number | null;
}

export interface CardTotal {
  holder: string;
  /** Subtotal que a fatura declara na linha "Total para <titular>". */
  declared: number;
  /** Soma dos lancamentos que o parser encontrou nesse bloco. */
  parsed: number;
}

export interface BradescoParseResult {
  items: BradescoItem[];
  previousBalance: number;
  /** "Total da fatura em real" (ou o total do cabecalho, se aquele faltar). */
  totalFatura?: number;
  /** Vencimento em ISO. Ancora o ano dos lancamentos, que na fatura so tem dia/mes. */
  dueDate?: string;
  cardTotals: CardTotal[];
  /** Soma dos lancamentos dentro dos blocos de cartao: e o que a fatura chama de total. */
  parsedTotal: number;
  error?: string;
}

/** Colunas da fatura, em pontos. Medidas numa fatura real; ver comentarios no teste. */
const COL = {
  /** A descricao comeca em ~66. */
  descStart: 60,
  /** A cidade comeca em ~205. */
  cityStart: 200,
  /** O valor R$ termina em ~344-353 e a coluna da direita comeca em ~364. */
  valueEnd: 355,
};

/** Titular atribuido a lancamentos fora de qualquer bloco de cartao (pagamentos da fatura). */
const HOLDER_OUTSIDE_CARD = 'Pagamentos';

const MONEY = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}`;
const RE_DUE = new RegExp(String.raw`R\$\s*(${MONEY})\s+(\d{2})/(\d{2})/(\d{4})`);
const RE_PREVIOUS = new RegExp(String.raw`Saldo anterior[.\s]*R\$\s*(${MONEY})`, 'i');
const RE_TOTAL = new RegExp(String.raw`^Total da fatura em real\s+(${MONEY})`, 'i');
const RE_CARD_TOTAL = new RegExp(String.raw`^Total para\s+(.+?)\s+(${MONEY})\s*$`, 'i');
const RE_CARD_HEADER = /^(.+?)\s+Cart[ãa]o\s+\d{4}\s+X{4}\s+X{4}\s+(\d{4})/i;
const RE_CARD_NUMBER_LABEL = /^N[uú]mero do Cart[ãa]o/i;
const RE_TRANSACTION = new RegExp(String.raw`^(\d{2})/(\d{2})\s+(.*?)\s*(${MONEY})\s*(-?)\s*$`);
const RE_DATE_ITEM = /^\d{2}\/\d{2}(\s|$)/;
const RE_INSTALLMENT = /(\d{2})\/(\d{2})(?=\s|$)/;

const parseMoney = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Texto so da parte esquerda da linha, sem o que vazou da coluna da direita. */
function leftItems(line: PdfLine): PdfTextItem[] {
  return line.items.filter((i) => i.x < COL.valueEnd);
}
const joinText = (items: PdfTextItem[]) => items.map((i) => i.text.trim()).join(' ');

export function parseBradescoFatura(lines: PdfLine[], today: Date = new Date()): BradescoParseResult {
  const items: BradescoItem[] = [];
  const cardTotals: CardTotal[] = [];
  let previousBalance = 0;
  let totalFatura: number | undefined;
  let headerTotal: number | undefined;
  let dueDate: string | undefined;

  let currentHolder = HOLDER_OUTSIDE_CARD;
  let inCardBlock = false;
  let cardSum = 0;
  let parsedTotal = 0;

  // O ano so pode ser resolvido depois de ler o vencimento (pagina 1), mas os
  // lancamentos vem depois (paginas 2+), entao um unico passo basta.
  const yearFor = (month: number): number => {
    const [refYear, refMonth] = dueDate
      ? [Number(dueDate.slice(0, 4)), Number(dueDate.slice(5, 7))]
      : [today.getFullYear(), today.getMonth() + 1];
    return month > refMonth ? refYear - 1 : refYear;
  };

  for (const line of lines) {
    const text = line.text;

    if (!dueDate) {
      const m = text.match(RE_DUE);
      if (m) {
        headerTotal = parseMoney(m[1]);
        dueDate = `${m[4]}-${m[3]}-${m[2]}`;
        continue;
      }
    }

    const prev = text.match(RE_PREVIOUS);
    if (prev) {
      previousBalance = parseMoney(prev[1]);
      continue;
    }

    const total = text.match(RE_TOTAL);
    if (total) {
      totalFatura = parseMoney(total[1]);
      continue;
    }

    const cardTotal = joinText(leftItems(line)).match(RE_CARD_TOTAL);
    if (cardTotal) {
      if (inCardBlock) {
        cardTotals.push({ holder: currentHolder, declared: parseMoney(cardTotal[2]), parsed: round2(cardSum) });
      }
      inCardBlock = false;
      currentHolder = HOLDER_OUTSIDE_CARD;
      continue;
    }

    const header = text.match(RE_CARD_HEADER);
    if (header && !RE_CARD_NUMBER_LABEL.test(text)) {
      currentHolder = `${header[1].trim()} (final ${header[2]})`;
      inCardBlock = true;
      cardSum = 0;
      continue;
    }

    const tx = parseTransaction(line);
    if (!tx) continue;

    const [dd, mm] = tx.date;
    const month = Number(mm);
    items.push({
      holder_name: currentHolder,
      transaction_date: `${yearFor(month)}-${mm}-${dd}`,
      description: tx.description,
      amount: tx.amount,
      category: autoCategory(tx.description),
      installment_current: tx.installment?.current ?? null,
      installment_total: tx.installment?.total ?? null,
    });
    if (inCardBlock) {
      cardSum += tx.amount;
      parsedTotal += tx.amount;
    }
  }

  if (items.length === 0) {
    return {
      items,
      previousBalance,
      cardTotals,
      parsedTotal: 0,
      error: 'Não foi possível identificar lançamentos no PDF. Verifique se é a Fatura Mensal do Bradesco Cartões.',
    };
  }

  return {
    items,
    previousBalance,
    totalFatura: totalFatura ?? headerTotal,
    dueDate,
    cardTotals,
    parsedTotal: round2(parsedTotal),
  };
}

interface Transaction {
  date: [dd: string, mm: string];
  description: string;
  amount: number;
  installment?: { current: number; total: number };
}

function parseTransaction(line: PdfLine): Transaction | null {
  const first = line.items[0];
  if (!first || !RE_DATE_ITEM.test(first.text.trim())) return null;

  const left = leftItems(line);
  const m = joinText(left).match(RE_TRANSACTION);
  if (!m) return null;
  const [, dd, mm, middle, value, minus] = m;

  // Descricao: o que esta entre a coluna da data e a da cidade. Se a geometria
  // nao ajudar (PDF com colunas diferentes), fica com o texto entre data e valor.
  const descByColumn = left
    .filter((i) => i !== first && i.x >= COL.descStart && i.x < COL.cityStart)
    .map((i) => i.text.trim())
    .join(' ');
  let description = descByColumn || middle;

  let installment: Transaction['installment'];
  const inst = description.match(RE_INSTALLMENT);
  if (inst) {
    const current = Number(inst[1]);
    const total = Number(inst[2]);
    if (current >= 1 && current <= total && total <= 99) {
      installment = { current, total };
      description = description.replace(inst[0], '');
    }
  }
  description = description.replace(/\s+/g, ' ').trim();
  if (!description) return null;

  return {
    date: [dd, mm],
    description,
    amount: parseMoney(value) * (minus ? -1 : 1),
    installment,
  };
}
