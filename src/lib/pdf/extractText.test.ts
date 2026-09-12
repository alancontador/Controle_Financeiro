import { describe, expect, it } from 'vitest';
import { trimToPdfHeader } from './extractText';

const enc = (s: string) => new TextEncoder().encode(s);

describe('trimToPdfHeader', () => {
  it('devolve o mesmo buffer quando ja comeca com %PDF', () => {
    const b = enc('%PDF-1.7\nabc');
    expect(trimToPdfHeader(b)).toBe(b);
  });

  it('corta bytes zero (ou qualquer lixo) antes do cabecalho', () => {
    const junk = new Uint8Array(1000);
    const pdf = enc('%PDF-1.4\nxyz');
    const b = new Uint8Array([...junk, ...pdf]);
    expect(new TextDecoder().decode(trimToPdfHeader(b))).toBe('%PDF-1.4\nxyz');
  });

  it('sem cabecalho, deixa como esta para o pdf.js reclamar', () => {
    const b = enc('nada aqui');
    expect(trimToPdfHeader(b)).toBe(b);
  });
});
