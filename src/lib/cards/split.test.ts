import { describe, expect, it } from 'vitest';
import { personShares, splitEqually, validateSplit } from './split';

describe('splitEqually', () => {
  it('divide em partes iguais e poe o resto de centavos na ultima pessoa, fechando o total', () => {
    // 100 / 3 = 33,33 + 33,33 + 33,34
    expect(splitEqually(100, ['A', 'B', 'C'])).toEqual([
      { person: 'A', amount: 33.33 },
      { person: 'B', amount: 33.33 },
      { person: 'C', amount: 33.34 },
    ]);
  });

  it('valor negativo (estorno) tambem divide e fecha', () => {
    const s = splitEqually(-59, ['A', 'B']);
    expect(s).toEqual([{ person: 'A', amount: -29.5 }, { person: 'B', amount: -29.5 }]);
  });

  it('sem pessoas devolve vazio', () => {
    expect(splitEqually(100, [])).toEqual([]);
  });
});

describe('validateSplit', () => {
  it('aceita quando as partes fecham o total ao centavo', () => {
    expect(validateSplit(100, [{ person: 'A', amount: 60 }, { person: 'B', amount: 40 }])).toEqual({ ok: true, diff: 0 });
  });

  it('rejeita quando sobra ou falta, informando a diferenca', () => {
    expect(validateSplit(100, [{ person: 'A', amount: 60 }, { person: 'B', amount: 30 }])).toEqual({ ok: false, diff: 10 });
    expect(validateSplit(100, [{ person: 'A', amount: 70 }, { person: 'B', amount: 40 }])).toEqual({ ok: false, diff: -10 });
  });

  it('rejeita pessoa repetida, parte zerada ou menos de duas pessoas', () => {
    expect(validateSplit(100, [{ person: 'A', amount: 50 }, { person: 'A', amount: 50 }]).ok).toBe(false);
    expect(validateSplit(100, [{ person: 'A', amount: 100 }, { person: 'B', amount: 0 }]).ok).toBe(false);
    expect(validateSplit(100, [{ person: 'A', amount: 100 }]).ok).toBe(false);
  });
});

describe('personShares', () => {
  const item = { holder_name: 'FERNANDA', assigned_to: null as string | null, amount: 300 };

  it('com divisao, cada pessoa recebe sua parte e fracao', () => {
    const shares = personShares(item, [{ person: 'FERNANDA', amount: 100 }, { person: 'JOSE', amount: 200 }]);
    expect(shares).toEqual([
      { person: 'FERNANDA', amount: 100, fraction: 1 / 3 },
      { person: 'JOSE', amount: 200, fraction: 2 / 3 },
    ]);
  });

  it('sem divisao, e a pessoa efetiva com o valor inteiro (realocacao respeitada)', () => {
    expect(personShares(item, [])).toEqual([{ person: 'FERNANDA', amount: 300, fraction: 1 }]);
    expect(personShares({ ...item, assigned_to: 'JOSE' }, [])).toEqual([{ person: 'JOSE', amount: 300, fraction: 1 }]);
  });
});
