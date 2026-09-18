export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Proxima data a partir de uma data ISO (aaaa-mm-dd). Mesma regra da edge
 * function process-recurring-transactions (manter as duas iguais): mensal cai
 * no mesmo dia do mes seguinte, encurtando para o ultimo dia se nao existir.
 */
export function nextExecutionDate(frequency: Frequency, current: string, dayOfMonth?: number | null): string {
  const [y, m, d] = current.split('-').map(Number);
  let next: Date;
  switch (frequency) {
    case 'daily': next = new Date(Date.UTC(y, m - 1, d + 1)); break;
    case 'weekly': next = new Date(Date.UTC(y, m - 1, d + 7)); break;
    case 'yearly': next = new Date(Date.UTC(y + 1, m - 1, Math.min(d, daysInMonth(y + 1, m)))); break;
    default: {
      const wanted = dayOfMonth ?? d;
      const ny = m === 12 ? y + 1 : y;
      const nm = m === 12 ? 1 : m + 1;
      next = new Date(Date.UTC(ny, nm - 1, Math.min(wanted, daysInMonth(ny, nm))));
    }
  }
  return next.toISOString().slice(0, 10);
}

/**
 * Primeira ocorrencia de uma recorrencia mensal a partir de hoje: o dia do mes
 * neste mes se ainda nao passou, senao no mes que vem. Evita o que acontecia
 * antes (salario dia 28 cadastrado dia 18 ficava para o mes seguinte).
 */
export function firstMonthlyOccurrence(dayOfMonth: number, today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const thisMonth = Math.min(dayOfMonth, daysInMonth(y, m));
  if (thisMonth >= d) return `${y}-${String(m).padStart(2, '0')}-${String(thisMonth).padStart(2, '0')}`;
  return nextExecutionDate('monthly', today, dayOfMonth);
}

/** Datas que uma recorrencia ainda vai gerar (para previsao), respeitando prazo e parcelas. */
export function upcomingOccurrences(
  r: { frequency: Frequency; next_execution_date: string; day_of_month: number | null; end_date: string | null; installments_total: number | null; installments_done: number },
  until: string,
  limit = 60,
): string[] {
  const out: string[] = [];
  let next = r.next_execution_date;
  let done = r.installments_done ?? 0;
  while (next <= until && out.length < limit) {
    if (r.end_date && next > r.end_date) break;
    if (r.installments_total && done >= r.installments_total) break;
    out.push(next);
    done++;
    next = nextExecutionDate(r.frequency, next, r.day_of_month);
  }
  return out;
}

export interface ForecastRecurring {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  frequency: Frequency;
  next_execution_date: string;
  day_of_month: number | null;
  end_date: string | null;
  installments_total: number | null;
  installments_done: number;
  is_active: boolean;
}

export interface MonthForecast {
  income: number;
  expense: number;
  items: { id: string; description: string; amount: number; type: 'income' | 'expense'; date: string }[];
}

/**
 * O que as recorrencias ainda vao lancar num mes (aaaa-mm): ocorrencias depois
 * de `today` (as ate hoje ja viraram transacao). E o "previsto" do dashboard:
 * salario dia 28 aparece como receita prevista antes de cair.
 */
export function forecastForMonth(recurrings: ForecastRecurring[], month: string, today: string): MonthForecast {
  const out: MonthForecast = { income: 0, expense: 0, items: [] };
  const [y, m] = month.split('-').map(Number);
  const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
  for (const r of recurrings) {
    if (!r.is_active) continue;
    for (const date of upcomingOccurrences(r, monthEnd)) {
      if (date <= today || !date.startsWith(month)) continue;
      out.items.push({ id: r.id, description: r.description, amount: r.amount, type: r.type, date });
      if (r.type === 'income') out.income += r.amount; else out.expense += r.amount;
    }
  }
  out.income = Math.round(out.income * 100) / 100;
  out.expense = Math.round(out.expense * 100) / 100;
  out.items.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** Renda mensal recorrente ativa (para comparar com parcelas quando ainda nao ha receita lancada). */
export function monthlyRecurringIncome(recurrings: ForecastRecurring[]): number {
  const factor: Record<Frequency, number> = { daily: 30, weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };
  return Math.round(recurrings.filter((r) => r.is_active && r.type === 'income').reduce((s, r) => s + r.amount * factor[r.frequency], 0) * 100) / 100;
}
