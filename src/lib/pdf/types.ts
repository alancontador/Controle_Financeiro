/** Um trecho de texto posicionado na pagina, como o pdf.js devolve. */
export interface PdfTextItem {
  text: string;
  /** Coordenada horizontal do inicio do trecho, em pontos. */
  x: number;
  /** Coordenada vertical da linha de base (origem no rodape da pagina). */
  y: number;
}

/** Uma linha visual da pagina: itens com a mesma altura, ordenados da esquerda para a direita. */
export interface PdfLine {
  page: number;
  y: number;
  items: PdfTextItem[];
  /** Itens unidos por espaco, na ordem horizontal. */
  text: string;
}

/** Bancos cujas faturas em PDF o sistema sabe ler. */
export type InvoiceBank = 'Bradesco' | 'Nubank';

/** Um lancamento lido da fatura, no formato comum a todos os bancos. */
export interface ParsedItem {
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
  /** Final do cartao do bloco; vazio quando a fatura soma por pessoa, nao por cartao. */
  lastFour: string;
  /** Subtotal que a fatura declara para o bloco. */
  declared: number;
  /** Soma dos lancamentos que o parser encontrou nesse bloco. */
  parsed: number;
}

/** Dados do cartao lidos do cabecalho, para pre-preencher o cadastro. */
export interface ParsedHeader {
  bank: InvoiceBank;
  /** Bandeira normalizada para o cadastro (Elo, Visa, Mastercard, Amex, Hipercard, Outro). */
  brand: string;
  /** Texto como esta na fatura, ex. "ELO GRAFITE". */
  brandLabel?: string;
  /** Final do cartao principal. */
  lastFour?: string;
  /** Limite de compras. */
  limit?: number;
  /** Data de fechamento desta fatura, ISO. */
  closingDate?: string;
  /** Nomes das pessoas, sem repeticao, na ordem dos blocos. */
  holders: string[];
  /** Cada cartao da fatura: pessoa + final do numero, na ordem. */
  cards: { holder: string; lastFour: string }[];
}

export interface ParseResult {
  header: ParsedHeader;
  items: ParsedItem[];
  previousBalance: number;
  /** Total de compras que a fatura declara (o que o parser tem que reproduzir). */
  totalFatura?: number;
  /** Vencimento em ISO. Ancora o ano dos lancamentos, que na fatura so tem dia/mes. */
  dueDate?: string;
  cardTotals: CardTotal[];
  /** Soma dos lancamentos dentro dos blocos de cartao: e o que a fatura chama de total. */
  parsedTotal: number;
  error?: string;
}
