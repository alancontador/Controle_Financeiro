import { parseBradescoFatura } from './bradesco';
import { parseNubankFatura } from './nubank';
import { parseItauFatura } from './itau';
import type { InvoiceBank, ParseResult, PdfLine } from './types';

export const SUPPORTED_BANKS: InvoiceBank[] = ['Bradesco', 'Nubank', 'Itaú'];

/**
 * Descobre de qual banco e a fatura pela estrutura do PDF, nao por uma palavra
 * solta (uma compra "NUBANK" numa fatura do Bradesco nao pode confundir).
 */
export function detectBank(lines: PdfLine[]): InvoiceBank | null {
  const texts = lines.map((l) => l.text);
  const has = (re: RegExp) => texts.some((t) => re.test(t));

  if (has(/N[uú]mero do Cart[ãa]o\s+\d{4}\s+X{4}/i) || has(/Total da fatura em real/i) || has(/bradesco\.com\.br|Bradesco Cart[õo]es/i)) {
    return 'Bradesco';
  }
  if (has(/^FATURA\s+\d{2}\s+[A-Z]{3}\s+\d{4}/i) || has(/Data de vencimento:\s*\d{2}\s+[A-Z]{3}\s+\d{4}/i) || has(/Nu Pagamentos|nubank\.com\.br/i)) {
    return 'Nubank';
  }
  if (has(/ITAU UNIBANCO HOLDING|Ita[uú] Cart[õo]es|itau\.com\.br/i) || has(/^Cart[ãa]o\s+\d{4}\.X{4}\.X{4}\.\d{4}/i)) {
    return 'Itaú';
  }
  return null;
}

/** Le a fatura com o parser do banco detectado. */
export function parseInvoice(lines: PdfLine[], today: Date = new Date()): ParseResult {
  const bank = detectBank(lines);
  if (bank === 'Nubank') return parseNubankFatura(lines, today);
  if (bank === 'Bradesco') return parseBradescoFatura(lines, today);
  if (bank === 'Itaú') return parseItauFatura(lines, today);
  return {
    header: { bank: 'Bradesco', brand: 'Outro', holders: [], cards: [] },
    items: [],
    previousBalance: 0,
    cardTotals: [],
    parsedTotal: 0,
    error: `Não reconheci o banco desta fatura. Faturas em PDF suportadas: ${SUPPORTED_BANKS.join(', ')}.`,
  };
}
