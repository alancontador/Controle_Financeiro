import { addMonths } from '@/lib/dates';
import { normalizeDescription } from '@/lib/pdf/categorize';
import { personOf } from '@/lib/people';

/**
 * Projecao das proximas faturas a partir dos lancamentos ja importados.
 *
 * - Comprometido: parcelas restantes (valor certo). So a fatura MAIS RECENTE
 *   de cada cartao conta: cada fatura ja carrega todas as parcelas em
 *   andamento, entao somar faturas antigas duplicaria.
 * - Estimado: gastos que se repetem - mesma descricao em >= 2 faturas (media
 *   por fatura) ou mesma descricao e valor >= 2 vezes numa fatura so
 *   (assinaturas cobradas juntas). Parcelas e creditos ficam de fora.
 */

export interface ProjectionItem {
  cardId: string;
  /** Pessoa do bloco da fatura (titular ou adicional). */
  holder: string;
  /** 'aaaa-mm' da fatura (mes do fechamento) em que o item apareceu. */
  invoiceMonth: string;
  description: string;
  amount: number;
  installment_current: number | null;
  installment_total: number | null;
}

export interface MonthProjection {
  month: string;
  committed: number;
  estimated: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const addMonthsToKey = (month: string, n: number) => addMonths(`${month}-01`, n).slice(0, 7);

export interface ProjectionOptions {
  months?: number;
  /**
   * Fatura mais recente por cartao, quando calculada sobre um conjunto maior
   * que `items` (ex.: projecao de uma pessoa usa a fatura mais recente do
   * cartao inteiro, senao itens de faturas antigas projetariam parcelas velhas).
   */
  latestByCard?: ReadonlyMap<string, string>;
}

export function latestInvoiceByCard(items: ProjectionItem[]): Map<string, string> {
  const latestByCard = new Map<string, string>();
  for (const i of items) {
    const cur = latestByCard.get(i.cardId);
    if (!cur || i.invoiceMonth > cur) latestByCard.set(i.cardId, i.invoiceMonth);
  }
  return latestByCard;
}

export function projectUpcomingInvoices(items: ProjectionItem[], opts: ProjectionOptions = {}): MonthProjection[] {
  const horizon = opts.months ?? 6;
  const latestByCard = opts.latestByCard ?? latestInvoiceByCard(items);
  if (latestByCard.size === 0) return [];
  const latest = [...latestByCard.values()].sort().at(-1)!;
  const months = Array.from({ length: horizon }, (_, k) => addMonthsToKey(latest, k + 1));
  const committed = new Map<string, number>(months.map((m) => [m, 0]));

  for (const i of items) {
    if (!i.installment_current || !i.installment_total) continue;
    if (i.invoiceMonth !== latestByCard.get(i.cardId)) continue;
    for (let k = 1; k <= i.installment_total - i.installment_current; k++) {
      const m = addMonthsToKey(i.invoiceMonth, k);
      if (committed.has(m)) committed.set(m, committed.get(m)! + i.amount);
    }
  }

  const estimatedPerMonth = recurringMonthly(items);

  return months.map((month) => ({
    month,
    committed: round2(committed.get(month) ?? 0),
    estimated: round2(estimatedPerMonth),
  }));
}

function recurringMonthly(items: ProjectionItem[]): number {
  const eligible = items.filter((i) => i.amount > 0 && !(i.installment_current && i.installment_total));

  // A) mesma descricao em >= 2 faturas: media por fatura da soma naquela fatura
  const byKey = new Map<string, Map<string, number>>(); // key -> invoiceMonth -> soma
  for (const i of eligible) {
    const key = normalizeDescription(i.description);
    if (!key) continue;
    const perInvoice = byKey.get(key) ?? new Map<string, number>();
    perInvoice.set(i.invoiceMonth, (perInvoice.get(i.invoiceMonth) ?? 0) + i.amount);
    byKey.set(key, perInvoice);
  }
  let total = 0;
  const crossInvoice = new Set<string>();
  for (const [key, perInvoice] of byKey) {
    if (perInvoice.size >= 2) {
      crossInvoice.add(key);
      const sum = [...perInvoice.values()].reduce((a, b) => a + b, 0);
      total += sum / perInvoice.size;
    }
  }

  // B) mesma descricao e mesmo valor >= 2 vezes numa fatura so (e nao coberta por A)
  const byKeyAmountInvoice = new Map<string, { amount: number; count: number }>();
  for (const i of eligible) {
    const key = normalizeDescription(i.description);
    if (!key || crossInvoice.has(key)) continue;
    const k = `${key}|${i.amount}|${i.invoiceMonth}`;
    const e = byKeyAmountInvoice.get(k) ?? { amount: i.amount, count: 0 };
    e.count += 1;
    byKeyAmountInvoice.set(k, e);
  }
  // Se o mesmo grupo aparece em varias faturas, A ja teria pego; aqui e uma fatura so.
  for (const e of byKeyAmountInvoice.values()) if (e.count >= 2) total += e.amount * e.count;

  return total;
}

/**
 * A mesma projecao, separada por pessoa. Todas as series usam o mesmo eixo de
 * meses (o da projecao total), para as colunas alinharem e a soma bater.
 */
export function projectUpcomingInvoicesByPerson(
  items: ProjectionItem[],
  opts: { months?: number } = {},
): Record<string, MonthProjection[]> {
  const latestByCard = latestInvoiceByCard(items);
  const total = projectUpcomingInvoices(items, { ...opts, latestByCard });
  if (total.length === 0) return {};
  const months = total.map((m) => m.month);

  const byPerson = new Map<string, ProjectionItem[]>();
  for (const i of items) {
    const p = personOf({ holder_name: i.holder });
    byPerson.set(p, [...(byPerson.get(p) ?? []), i]);
  }

  const out: Record<string, MonthProjection[]> = {};
  for (const [person, its] of byPerson) {
    const own = projectUpcomingInvoices(its, { ...opts, latestByCard });
    const byMonth = new Map(own.map((m) => [m.month, m]));
    out[person] = months.map((month) => ({
      month,
      committed: byMonth.get(month)?.committed ?? 0,
      estimated: byMonth.get(month)?.estimated ?? 0,
    }));
  }
  return out;
}
