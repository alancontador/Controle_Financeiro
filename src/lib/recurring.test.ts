import { describe, expect, it } from 'vitest';
import { firstMonthlyOccurrence, forecastForMonth, monthlyRecurringIncome, nextExecutionDate, upcomingOccurrences } from './recurring';

describe('nextExecutionDate', () => {
  it('mensal mantem o dia e encurta quando o mes e menor', () => {
    expect(nextExecutionDate('monthly', '2026-01-31', 31)).toBe('2026-02-28');
    expect(nextExecutionDate('monthly', '2026-02-28', 31)).toBe('2026-03-31');
    expect(nextExecutionDate('monthly', '2026-12-10', 10)).toBe('2027-01-10');
  });
  it('diaria, semanal e anual', () => {
    expect(nextExecutionDate('daily', '2026-02-28')).toBe('2026-03-01');
    expect(nextExecutionDate('weekly', '2026-12-28')).toBe('2027-01-04');
    expect(nextExecutionDate('yearly', '2024-02-29')).toBe('2025-02-28');
  });
});

describe('firstMonthlyOccurrence', () => {
  it('dia ainda por vir fica neste mes; dia passado vai para o proximo', () => {
    expect(firstMonthlyOccurrence(28, '2026-09-18')).toBe('2026-09-28');
    expect(firstMonthlyOccurrence(18, '2026-09-18')).toBe('2026-09-18');
    expect(firstMonthlyOccurrence(5, '2026-09-18')).toBe('2026-10-05');
    expect(firstMonthlyOccurrence(31, '2026-02-10')).toBe('2026-02-28');
  });
});

describe('upcomingOccurrences', () => {
  const base = { frequency: 'monthly' as const, next_execution_date: '2026-10-05', day_of_month: 5, end_date: null, installments_total: null, installments_done: 0 };
  it('sem prazo gera ate a data pedida', () => {
    expect(upcomingOccurrences(base, '2026-12-31')).toEqual(['2026-10-05', '2026-11-05', '2026-12-05']);
  });
  it('para nas parcelas restantes', () => {
    expect(upcomingOccurrences({ ...base, installments_total: 10, installments_done: 8 }, '2027-12-31')).toEqual(['2026-10-05', '2026-11-05']);
  });
  it('para na data final', () => {
    expect(upcomingOccurrences({ ...base, end_date: '2026-11-30' }, '2027-12-31')).toEqual(['2026-10-05', '2026-11-05']);
  });
});

describe('forecastForMonth', () => {
  const salary = { id: 's', description: 'Salário', amount: 3046.09, type: 'income' as const, frequency: 'monthly' as const, next_execution_date: '2026-09-28', day_of_month: 28, end_date: null, installments_total: null, installments_done: 0, is_active: true };
  const rent = { ...salary, id: 'r', description: 'Aluguel', amount: 1500, type: 'expense' as const, next_execution_date: '2026-09-05', day_of_month: 5 };
  it('soma so o que ainda nao caiu no mes', () => {
    const f = forecastForMonth([salary, rent], '2026-09', '2026-09-18');
    expect(f.income).toBe(3046.09);
    expect(f.expense).toBe(0); // dia 5 ja passou: ja e transacao
    expect(f.items.map((i) => i.date)).toEqual(['2026-09-28']);
  });
  it('mes seguinte inteiro e previsto', () => {
    const f = forecastForMonth([salary, rent], '2026-10', '2026-09-18');
    expect(f.income).toBe(3046.09);
    expect(f.expense).toBe(1500);
  });
  it('ignora inativas e respeita parcelas', () => {
    expect(forecastForMonth([{ ...salary, is_active: false }], '2026-09', '2026-09-18').income).toBe(0);
    expect(forecastForMonth([{ ...rent, installments_total: 1, installments_done: 1 }], '2026-10', '2026-09-18').expense).toBe(0);
  });
  it('renda mensal recorrente', () => {
    expect(monthlyRecurringIncome([salary, rent])).toBe(3046.09);
  });
});
