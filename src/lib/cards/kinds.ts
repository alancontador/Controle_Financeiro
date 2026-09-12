/**
 * Tipo de cada cartao que aparece numa fatura. As faturas (Bradesco, Nubank)
 * nao rotulam: trazem so nome do titular e numero mascarado por bloco. Regras:
 * - o numero do cabecalho ("Numero do Cartao") e o principal;
 * - outro numero do MESMO titular e um cartao virtual/temporario;
 * - numero em nome de OUTRA pessoa e um cartao adicional.
 * O que o usuario ja classificou antes (por numero) vence a inferencia.
 */

export type CardKind = 'principal' | 'adicional' | 'virtual';

export const CARD_KINDS: CardKind[] = ['principal', 'virtual', 'adicional'];

export const CARD_KIND_LABEL: Record<CardKind, string> = {
  principal: 'Cartão principal',
  virtual: 'Cartão virtual/temporário',
  adicional: 'Cartão adicional',
};

export interface InvoiceCardRef {
  holder: string;
  lastFour: string;
}

export interface InvoiceCard extends InvoiceCardRef {
  kind: CardKind;
}

const personKey = (name: string) => name.trim().toUpperCase().replace(/\s+/g, ' ');

export function classifyInvoiceCards(
  header: { lastFour?: string; cards: InvoiceCardRef[] },
  known: ReadonlyMap<string, CardKind> = new Map(),
): InvoiceCard[] {
  const principal = header.cards.find((c) => c.lastFour === header.lastFour) ?? header.cards[0];
  const principalHolder = principal ? personKey(principal.holder) : '';

  return header.cards.map((c) => {
    const remembered = known.get(c.lastFour);
    if (remembered) return { ...c, kind: remembered };
    if (c.lastFour === principal?.lastFour) return { ...c, kind: 'principal' };
    return { ...c, kind: personKey(c.holder) === principalHolder ? 'virtual' : 'adicional' };
  });
}
