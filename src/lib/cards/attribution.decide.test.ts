import { describe, expect, it } from 'vitest';
import { decideImportAttribution } from './attribution';

const AMOUNT = 100;
const lembradoAilton = { assigned_to: 'Ailton' };
const lembradoDividido = { shares: [{ person: 'A', fraction: 0.5 }, { person: 'B', fraction: 0.5 }] };

describe('decideImportAttribution', () => {
  it('sem escolha e sem memoria: fica com o titular', () => {
    expect(decideImportAttribution(AMOUNT, {}, null)).toEqual({ assigned: null, splitToApply: [], memory: null });
  });

  it('sem escolha: reaplica a realocacao lembrada e nao mexe na memoria', () => {
    expect(decideImportAttribution(AMOUNT, {}, lembradoAilton)).toEqual({ assigned: 'Ailton', splitToApply: [], memory: null });
  });

  it('escolheu outra pessoa: vence a memoria e passa a ser o lembrado', () => {
    expect(decideImportAttribution(AMOUNT, { assignedInReview: 'Rodrigo', personTouched: true }, lembradoAilton))
      .toEqual({ assigned: 'Rodrigo', splitToApply: [], memory: { assigned_to: 'Rodrigo', shares: null } });
  });

  it('escolheu o titular de volta: esquece a realocacao lembrada (era o bug)', () => {
    expect(decideImportAttribution(AMOUNT, { assignedInReview: null, personTouched: true }, lembradoAilton))
      .toEqual({ assigned: null, splitToApply: [], memory: { assigned_to: null, shares: null } });
  });

  it('dividiu na revisao: grava as partes e lembra as fracoes', () => {
    const d = decideImportAttribution(AMOUNT, { splitShares: [{ person: 'A', amount: 70 }, { person: 'B', amount: 30 }] }, null);
    expect(d.assigned).toBeNull();
    expect(d.splitToApply).toHaveLength(2);
    expect(d.memory?.shares).toEqual([{ person: 'A', fraction: 0.7 }, { person: 'B', fraction: 0.3 }]);
  });

  it('tirou a divisao lembrada: esquece as fracoes', () => {
    expect(decideImportAttribution(AMOUNT, { splitShares: [] }, lembradoDividido))
      .toEqual({ assigned: null, splitToApply: [], memory: { assigned_to: null, shares: null } });
  });

  it('sem mexer: recria a divisao lembrada em valores', () => {
    const d = decideImportAttribution(AMOUNT, {}, lembradoDividido);
    expect(d.splitToApply).toEqual([{ person: 'A', amount: 50 }, { person: 'B', amount: 50 }]);
    expect(d.memory).toBeNull();
  });
});
