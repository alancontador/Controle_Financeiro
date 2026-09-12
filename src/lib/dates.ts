/** Utilitarios de data em ISO (aaaa-mm-dd), sem fuso: tudo e calendario local. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Mesmo dia N meses depois (negativo = antes), sem estourar o fim do mes (31/03 -1 -> 28/02). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return toIsoDate(target);
}

/** 'aaaa-mm' do mes de uma data ISO. */
export const monthKey = (iso: string) => iso.slice(0, 7);
