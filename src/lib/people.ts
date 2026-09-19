/**
 * Pessoa como dimensao dos gastos. As pessoas vem dos cartoes (titular,
 * adicionais); o que nao tem pessoa (lancamento manual sem atribuicao,
 * recorrente) cai em "Casa/Comum" para a comparacao entre pessoas ficar
 * honesta e o gasto da casa aparecer separado.
 */

/** Nome impresso na fatura -> nome escolhido pelo usuario (apelidos cadastrados em people). */
export type AliasMap = ReadonlyMap<string, string>;

const aliasKey = (n: string) => n.trim().toUpperCase().replace(/\s+/g, ' ');

export function buildAliasMap(people: { name: string; aliases?: string[] | null }[]): AliasMap {
  const map = new Map<string, string>();
  for (const p of people) for (const a of p.aliases ?? []) if (a?.trim()) map.set(aliasKey(a), p.name);
  return map;
}

export function canonicalPerson(name: string, aliases: AliasMap): string {
  return aliases.get(aliasKey(name)) ?? name;
}

/** Troca os nomes da fatura lida pelos nomes que o usuario escolheu (renomeou em Pessoas). */
export function applyPersonAliases<T extends { header: { holders: string[]; cards: { holder: string; lastFour: string }[] }; items: { holder_name: string }[]; cardTotals: { holder: string }[] }>(result: T, aliases: AliasMap): T {
  if (aliases.size === 0) return result;
  const c = (n: string) => canonicalPerson(n, aliases);
  return {
    ...result,
    header: {
      ...result.header,
      holders: [...new Set(result.header.holders.map(c))],
      cards: result.header.cards.map((k) => ({ ...k, holder: c(k.holder) })),
    },
    items: result.items.map((i) => ({ ...i, holder_name: c(i.holder_name) })),
    cardTotals: result.cardTotals.map((t) => ({ ...t, holder: c(t.holder) })),
  };
}

export const COMMON_PERSON = 'Casa/Comum';

export function personOf(t: { holder_name: string | null | undefined }): string {
  const name = t.holder_name?.trim();
  return name ? name : COMMON_PERSON;
}

/**
 * Pessoa responsavel por um lancamento de fatura: a realocacao (assigned_to)
 * vence o titular do cartao (holder_name). A compra continua no cartao; so a
 * atribuicao da despesa muda.
 */
export function effectivePerson(item: { holder_name: string | null | undefined; assigned_to?: string | null }): string {
  const reassigned = item.assigned_to?.trim();
  return reassigned ? reassigned : personOf(item);
}

export interface PersonTx {
  holder_name: string | null;
  amount: number;
  type: 'income' | 'expense';
  /** ISO aaaa-mm-dd */
  date: string;
  category_name?: string | null;
}

export interface PersonSummary {
  person: string;
  total: number;
  /** Fatia do total de despesas do mes (0..1). */
  share: number;
  previousTotal?: number;
  topCategories: { category: string; total: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Despesas do mes (aaaa-mm) somadas por pessoa, da maior para a menor, com
 * fatia do total e as 3 maiores categorias de cada uma. Receitas ficam fora;
 * estornos (valor negativo) reduzem.
 */
export function summarizeByPerson(
  txs: PersonTx[],
  month: string,
  opts: { previousMonth?: string; topN?: number } = {},
): PersonSummary[] {
  const topN = opts.topN ?? 3;
  const inMonth = (t: PersonTx, m: string) => t.type === 'expense' && t.date.slice(0, 7) === m;

  const totals = new Map<string, number>();
  const cats = new Map<string, Map<string, number>>();
  for (const t of txs) {
    if (!inMonth(t, month)) continue;
    const p = personOf(t);
    totals.set(p, (totals.get(p) ?? 0) + t.amount);
    const c = t.category_name?.trim() || 'Sem categoria';
    const byCat = cats.get(p) ?? new Map<string, number>();
    byCat.set(c, (byCat.get(c) ?? 0) + t.amount);
    cats.set(p, byCat);
  }

  const previous = new Map<string, number>();
  if (opts.previousMonth) {
    for (const t of txs) {
      if (!inMonth(t, opts.previousMonth)) continue;
      const p = personOf(t);
      previous.set(p, (previous.get(p) ?? 0) + t.amount);
    }
  }

  const grand = [...totals.values()].reduce((s, v) => s + v, 0);
  return [...totals.entries()]
    .map(([person, total]) => ({
      person,
      total: round2(total),
      share: grand > 0 ? round2(total / grand) : 0,
      ...(opts.previousMonth ? { previousTotal: round2(previous.get(person) ?? 0) } : {}),
      topCategories: [...(cats.get(person) ?? new Map()).entries()]
        .map(([category, t]) => ({ category, total: round2(t) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, topN),
    }))
    .sort((a, b) => b.total - a.total);
}

/** Mesma regra para filtrar em memoria. */
export function matchesPerson(tx: { holder_name?: string | null }, person: string | null | undefined): boolean {
  if (!person) return true;
  if (person === COMMON_PERSON) return !tx.holder_name;
  return tx.holder_name === person;
}
