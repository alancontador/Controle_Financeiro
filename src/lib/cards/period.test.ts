import { describe, expect, it } from 'vitest';
import { invoicePeriodFromClosing } from './period';

describe('invoicePeriodFromClosing', () => {
  it('vai do dia seguinte ao fechamento anterior ate o fechamento', () => {
    expect(invoicePeriodFromClosing('2026-08-28')).toEqual({ period_start: '2026-07-29', period_end: '2026-08-28' });
  });

  it('nao estoura o fim do mes anterior quando o fechamento e dia 31', () => {
    // fechamento anterior seria "31/02", que nao existe: vira 28/02, e o periodo comeca em 01/03
    expect(invoicePeriodFromClosing('2026-03-31')).toEqual({ period_start: '2026-03-01', period_end: '2026-03-31' });
  });

  it('atravessa a virada do ano', () => {
    expect(invoicePeriodFromClosing('2026-01-10')).toEqual({ period_start: '2025-12-11', period_end: '2026-01-10' });
  });
});
