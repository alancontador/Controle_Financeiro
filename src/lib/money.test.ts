import { describe, expect, it } from 'vitest';
import { formatBRLInput, maskBRLDigits, parseBRL } from './money';

describe('money', () => {
  it('mascara por digitos', () => {
    expect(maskBRLDigits('1')).toBe('0,01');
    expect(maskBRLDigits('123456')).toBe('1.234,56');
    expect(maskBRLDigits('1.234,56')).toBe('1.234,56');
    expect(maskBRLDigits('')).toBe('');
    expect(maskBRLDigits('abc')).toBe('');
  });
  it('parse aceita os formatos que aparecem nos formularios', () => {
    expect(parseBRL('1.234,56')).toBe(1234.56);
    expect(parseBRL('1234.56')).toBe(1234.56);
    expect(parseBRL('1234,5')).toBe(1234.5);
    expect(parseBRL('R$ 10,00')).toBe(10);
    expect(parseBRL('-50,00')).toBe(-50);
    expect(parseBRL('')).toBe(0);
    expect(parseBRL(12.3)).toBe(12.3);
  });
  it('formata', () => {
    expect(formatBRLInput(1234.5)).toBe('1.234,50');
    expect(formatBRLInput(null)).toBe('');
  });
});
