import { describe, expect, it } from 'vitest';
import { normalizeDescription, suggestCategory } from './categorize';

describe('normalizeDescription', () => {
  it('poe em maiusculas, tira acentos e espacos repetidos', () => {
    expect(normalizeDescription('  Padaria São   José ')).toBe('PADARIA SAO JOSE');
  });

  it('remove numeros de loja/terminal, que mudam entre compras do mesmo lugar', () => {
    expect(normalizeDescription('ATACADAO 617 SA')).toBe('ATACADAO SA');
    expect(normalizeDescription('MAGALU FL 1522')).toBe('MAGALU FL');
    expect(normalizeDescription('JIM COM 43936334 GABRIELL')).toBe('JIM COM GABRIELL');
  });

  it('remove a parcela, colada ou nao', () => {
    expect(normalizeDescription('MOTO ONE 09/10')).toBe('MOTO ONE');
    expect(normalizeDescription('LUNTA COMERCIO DE VE02/10')).toBe('LUNTA COMERCIO DE VE');
  });

  it('mantem letras coladas a numeros que fazem parte do nome (pix, 99app)', () => {
    expect(normalizeDescription('99APP')).toBe('99APP');
  });
});

describe('suggestCategory', () => {
  const memory = new Map([
    ['APPLE COM BILL', 'Assinaturas e Serviços'],
    ['DROGA LOVE', 'Pets'], // o usuario corrigiu: e uma pet shop, nao farmacia
  ]);

  it('memoria vence a regra: o que o usuario corrigiu prevalece', () => {
    expect(suggestCategory('DROGA LOVE', memory)).toEqual({ category: 'Pets', source: 'memory' });
  });

  it('memoria e por descricao normalizada (ignora numero de loja e parcela)', () => {
    expect(suggestCategory('APPLE COM BILL 02/03', memory).category).toBe('Assinaturas e Serviços');
  });

  it('regras por palavra-chave quando nao ha memoria', () => {
    expect(suggestCategory('DROGARIA SAO PAULO497', memory)).toEqual({ category: 'Saúde', source: 'rule' });
    expect(suggestCategory('AUTO POSTO SILGUEKRON', memory).category).toBe('Transporte');
    expect(suggestCategory('MERCADO EXTRA 1326', memory).category).toBe('Mercado');
    expect(suggestCategory('ATACADAO 617 SA', memory).category).toBe('Mercado');
    expect(suggestCategory('CLINICA ALPHA VET', memory).category).toBe('Pets');
    expect(suggestCategory('XVET DIAGNOSTICOS', memory).category).toBe('Pets');
    expect(suggestCategory('BORGES PARKING ALAMEDA', memory).category).toBe('Transporte');
    expect(suggestCategory('SP MARKET ESTACIONAMEN', memory).category).toBe('Transporte');
    expect(suggestCategory('DECATHLON', memory).category).toBe('Esportes');
    expect(suggestCategory('HOTMART YURI YURI RO', memory).category).toBe('Educação');
    expect(suggestCategory('NETFLIX COM', memory).category).toBe('Assinaturas e Serviços');
    expect(suggestCategory('IOF DIARIO ROTATIV/ATRASO', memory).category).toBe('Tarifas Bancárias');
    expect(suggestCategory('ESTORNO ANUIDADE INTER', memory).category).toBe('Tarifas Bancárias');
    expect(suggestCategory('ADEGA GLOBAL LTDA ME', memory).category).toBe('Restaurantes');
    expect(suggestCategory('BESNI SHOP GUARULHOS', memory).category).toBe('Vestuário');
    expect(suggestCategory('JULIA LASER', memory).category).toBe('Cuidados Pessoais');
    // vistos na fatura real
    expect(suggestCategory('DENTAL SPEED Quantit', memory).category).toBe('Saúde');
    expect(suggestCategory('MarleyMall', memory).category).toBe('Compras');
    expect(suggestCategory('CASA DAS ALIANCAS', memory).category).toBe('Compras');
    expect(suggestCategory('ARTWALK', memory).category).toBe('Vestuário');
  });

  it('a regra mais especifica vence quando duas casam (VET antes de CLINICA)', () => {
    // "CLINICA" sozinha seria Saude; com "VET" e Pets.
    expect(suggestCategory('CLINICA VETERINARIA', memory).category).toBe('Pets');
  });

  it('casa por palavra inteira: "SPAD" nao e "SPA"', () => {
    expect(suggestCategory('SPAD', memory).category).not.toBe('Cuidados Pessoais');
  });

  it('sem memoria nem regra cai em Outros', () => {
    expect(suggestCategory('MP TENDADAONCA', memory)).toEqual({ category: 'Outros', source: 'fallback' });
  });
});
