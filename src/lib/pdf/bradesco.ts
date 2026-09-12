import { autoCategory } from './autoCategory';
import { addMonths } from '@/lib/dates';
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
  /** Pessoa (titular ou adicional) do bloco em que o lancamento aparece; "Pagamentos" fora de bloco. */
  holder_name: string;
  /** Final do cartao do bloco (principal, virtual ou adicional); null fora de bloco. */
  card_last_four: string | null;
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
  lastFour: string;
  /** Subtotal que a fatura declara na linha "Total para <titular>". */
  declared: number;
  /** Soma dos lancamentos que o parser encontrou nesse bloco. */
  parsed: number;
}

/** Dados do cartao lidos do cabecalho, para pre-preencher o cadastro. */
export interface BradescoHeader {
  bank: 'Bradesco';
  /** Bandeira normalizada para o cadastro (Elo, Visa, Mastercard, Amex, Hipercard, Outro). */
  brand: string;
  /** Texto como esta na fatura, ex. "ELO GRAFITE". */
  brandLabel?: string;
  /** Final do cartao principal ("Numero do Cartao"). */
  lastFour?: string;
  /** Limite de compras. */
  limit?: number;
  /** Data de fechamento desta fatura, ISO. */
  closingDate?: string;
  /** Nomes das pessoas, sem repeticao, na ordem dos blocos. */
  holders: string[];
  /** Cada bloco de cartao da fatura: pessoa + final do numero, na ordem. */
  cards: { holder: string; lastFour: string }[];
}

export interface BradescoParseResult {
  header: BradescoHeader;
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
const RE_CARD_NUMBER = /N[uú]mero do Cart[ãa]o\s+\d{4}\s+X{4}\s+X{4}\s+(\d{4})/i;
const RE_BRAND = /^(ELO|VISA|MASTERCARD|MASTER|AMEX|HIPERCARD)\b/i;
const RE_LIMIT_LABEL = /^Limite de compras/i;
const RE_LIMIT_VALUE = new RegExp(String.raw`^R\$\s*(${MONEY})`);
const RE_AVAILABLE_AT = /^Dispon[ií]vel em/i;
const RE_FULL_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const RE_NEXT_CLOSING = /Previs[ãa]o de fechamento[^:]*:\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const RE_TRANSACTION = new RegExp(String.raw`^(\d{2})/(\d{2})\s+(.*?)\s*(${MONEY})\s*(-?)\s*$`);
const RE_DATE_ITEM = /^\d{2}\/\d{2}(\s|$)/;
const RE_INSTALLMENT = /(\d{2})\/(\d{2})(?=\s|$)/;

const parseMoney = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const toIso = (dd: string, mm: string, yyyy: string) => `${yyyy}-${mm}-${dd}`;

const BRAND_NAMES: Record<string, string> = {
  ELO: 'Elo', VISA: 'Visa', MASTERCARD: 'Mastercard', MASTER: 'Mastercard', AMEX: 'Amex', HIPERCARD: 'Hipercard',
};
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
  let currentLastFour: string | null = null;
  let inCardBlock = false;
  let cardSum = 0;
  let parsedTotal = 0;

  const header: BradescoHeader = { bank: 'Bradesco', brand: 'Outro', holders: [], cards: [] };
  let nextClosing: string | undefined;

  // O ano so pode ser resolvido depois de ler o vencimento (pagina 1), mas os
  // lancamentos vem depois (paginas 2+), entao um unico passo basta.
  const yearFor = (month: number): number => {
    const [refYear, refMonth] = dueDate
      ? [Number(dueDate.slice(0, 4)), Number(dueDate.slice(5, 7))]
      : [today.getFullYear(), today.getMonth() + 1];
    return month > refMonth ? refYear - 1 : refYear;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const text = line.text;

    // ---- cabecalho do cartao (pagina 1 e topo da 2) ----
    if (!header.brandLabel && line.page === 1) {
      const brandItem = line.items.find((i) => RE_BRAND.test(i.text.trim()));
      if (brandItem) {
        header.brandLabel = brandItem.text.trim();
        header.brand = BRAND_NAMES[brandItem.text.trim().match(RE_BRAND)![1].toUpperCase()] ?? 'Outro';
      }
    }
    if (!header.lastFour) {
      const m = text.match(RE_CARD_NUMBER);
      if (m) header.lastFour = m[1];
    }
    if (header.limit === undefined && RE_LIMIT_LABEL.test(text)) {
      // O rotulo e o valor ficam em linhas diferentes, as vezes com um codigo da
      // coluna da esquerda no meio. A primeira linha seguinte que COMECA com R$
      // traz o limite de compras (o segundo valor dela e o de saque).
      for (let j = idx + 1; j <= idx + 3 && j < lines.length; j++) {
        const m = lines[j].text.match(RE_LIMIT_VALUE);
        if (m) {
          header.limit = parseMoney(m[1]);
          break;
        }
      }
    }
    if (!header.closingDate && line.items.some((i) => RE_AVAILABLE_AT.test(i.text.trim()))) {
      // A data fica na linha de baixo, na coluna da direita - e pode ter sido
      // agrupada com um lancamento da esquerda. Procura por item, nao por linha.
      for (let j = idx + 1; j <= idx + 3 && j < lines.length && !header.closingDate; j++) {
        const d = lines[j].items.find((i) => i.x >= COL.valueEnd && RE_FULL_DATE.test(i.text.trim()));
        if (d) {
          const [, dd, mm, yyyy] = d.text.trim().match(RE_FULL_DATE)!;
          header.closingDate = toIso(dd, mm, yyyy);
        }
      }
    }
    if (!nextClosing) {
      const m = text.match(RE_NEXT_CLOSING);
      if (m) nextClosing = toIso(m[1], m[2], m[3]);
    }

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
      if (inCardBlock && currentLastFour) {
        cardTotals.push({ holder: currentHolder, lastFour: currentLastFour, declared: parseMoney(cardTotal[2]), parsed: round2(cardSum) });
      }
      inCardBlock = false;
      currentHolder = HOLDER_OUTSIDE_CARD;
      currentLastFour = null;
      continue;
    }

    const cardHeader = text.match(RE_CARD_HEADER);
    if (cardHeader && !RE_CARD_NUMBER_LABEL.test(text)) {
      const name = cardHeader[1].trim();
      if (!header.holders.includes(name)) header.holders.push(name);
      header.cards.push({ holder: name, lastFour: cardHeader[2] });
      currentHolder = name;
      currentLastFour = cardHeader[2];
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
      card_last_four: currentLastFour,
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

  if (!header.closingDate && nextClosing) header.closingDate = addMonths(nextClosing, -1);

  if (items.length === 0) {
    return {
      header,
      items,
      previousBalance,
      cardTotals,
      parsedTotal: 0,
      error: 'Não foi possível identificar lançamentos no PDF. Verifique se é a Fatura Mensal do Bradesco Cartões.',
    };
  }

  return {
    header,
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
