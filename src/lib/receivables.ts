/**
 * Quanto cada terceiro deve: compras atribuidas a ele (nos seus cartoes)
 * menos os pagamentos que ele fez. Estornos atribuidos reduzem a divida.
 */

export interface Charge {
  person: string;
  amount: number;
  date: string;
  description: string;
}

export interface Payment {
  person: string;
  amount: number;
  date: string;
}

export interface Receivable {
  person: string;
  charged: number;
  paid: number;
  /** Positivo: a pessoa deve; negativo: pagou a mais. */
  balance: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeReceivables(charges: Charge[], payments: Payment[], include: string[] = []): Receivable[] {
  const map = new Map<string, Receivable>();
  const get = (person: string) => {
    let r = map.get(person);
    if (!r) { r = { person, charged: 0, paid: 0, balance: 0 }; map.set(person, r); }
    return r;
  };
  for (const p of include) get(p);
  for (const c of charges) get(c.person).charged += c.amount;
  for (const p of payments) get(p.person).paid += p.amount;
  return [...map.values()]
    .map((r) => ({ ...r, charged: round2(r.charged), paid: round2(r.paid), balance: round2(r.charged - r.paid) }))
    .sort((a, b) => b.balance - a.balance);
}
