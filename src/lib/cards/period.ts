import { addDays, addMonths } from '@/lib/dates';

/**
 * Periodo de uma fatura a partir da data de fechamento: comeca no dia seguinte
 * ao fechamento anterior (mesmo dia do mes anterior) e termina no fechamento.
 */
export function invoicePeriodFromClosing(closingDate: string): { period_start: string; period_end: string } {
  return {
    period_start: addDays(addMonths(closingDate, -1), 1),
    period_end: closingDate,
  };
}
