import { effectivePerson } from '@/lib/people';

/**
 * Divisao de uma compra entre pessoas. A compra continua um lancamento so na
 * fatura (e na conferencia com o banco); as partes dizem quanto cabe a cada
 * pessoa. A despesa espelhada vira uma por parte, e as parcelas futuras
 * seguem a fracao de cada pessoa.
 */

export interface Share {
  person: string;
  amount: number;
}

export interface PersonShare extends Share {
  /** Parte do valor total (0..1); 1 quando nao ha divisao. */
  fraction: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Partes iguais; o resto de centavos vai para a ultima pessoa, para fechar o total exato. */
export function splitEqually(amount: number, people: string[]): Share[] {
  if (people.length === 0) return [];
  const base = round2(amount / people.length);
  const shares = people.map((person) => ({ person, amount: base }));
  const sum = round2(base * people.length);
  shares[shares.length - 1].amount = round2(base + (amount - sum));
  return shares;
}

/** Fecha ao centavo, sem pessoa repetida, sem parte zerada, com pelo menos duas pessoas. */
export function validateSplit(amount: number, shares: Share[]): { ok: boolean; diff: number } {
  const diff = round2(amount - shares.reduce((s, x) => s + x.amount, 0));
  const people = new Set(shares.map((s) => s.person.trim()));
  const ok =
    shares.length >= 2 &&
    people.size === shares.length &&
    shares.every((s) => s.person.trim() !== '' && s.amount !== 0) &&
    diff === 0;
  return { ok, diff };
}

/**
 * Quanto de um lancamento cabe a cada pessoa: as partes, quando ha divisao;
 * senao a pessoa efetiva (realocacao ou titular) com o valor inteiro.
 */
export function personShares(
  item: { holder_name: string | null; assigned_to?: string | null; amount: number },
  splits: Share[],
): PersonShare[] {
  if (splits.length > 0 && item.amount !== 0) {
    return splits.map((s) => ({ person: s.person, amount: s.amount, fraction: s.amount / item.amount }));
  }
  return [{ person: effectivePerson(item), amount: item.amount, fraction: 1 }];
}
