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
