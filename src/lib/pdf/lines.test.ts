import { describe, expect, it } from 'vitest';
import { groupIntoLines } from './lines';
import type { PdfTextItem } from './types';

const item = (text: string, x: number, y: number): PdfTextItem => ({ text, x, y });

describe('groupIntoLines', () => {
  it('agrupa itens com a mesma altura e ordena da esquerda para a direita', () => {
    const lines = groupIntoLines(
      [item('101,99', 327.6, 694.4), item('MOTO ONE', 66.6, 694.4), item('17/12', 45.4, 694.4)],
      2,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('17/12 MOTO ONE 101,99');
    expect(lines[0].page).toBe(2);
  });

  it('ordena as linhas de cima para baixo (y maior primeiro, como no PDF)', () => {
    const lines = groupIntoLines([item('embaixo', 45, 100), item('em cima', 45, 700)], 1);
    expect(lines.map((l) => l.text)).toEqual(['em cima', 'embaixo']);
  });

  it('junta na mesma linha um item deslocado poucos pontos na vertical', () => {
    // O sinal de menos de um estorno vem como item separado, ~1,2pt abaixo do valor.
    // Se cair em outra linha, o credito vira debito.
    const lines = groupIntoLines(
      [item('28/07', 45.4, 635.4), item('ESTORNO', 66.6, 635.4), item('59,00', 328.5, 635.4), item('-', 347.2, 634.2)],
      2,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('28/07 ESTORNO 59,00 -');
  });

  it('separa em linhas diferentes itens alem da tolerancia', () => {
    const lines = groupIntoLines([item('a', 45, 100), item('b', 45, 96)], 1);
    expect(lines).toHaveLength(2);
  });

  it('nao deixa a tolerancia "escorregar" por uma sequencia de itens proximos', () => {
    // Cada item esta a 2pt do anterior, mas o ultimo esta a 6pt do primeiro:
    // comparar com a linha de referencia (nao com o ultimo item) evita fundir tudo.
    const lines = groupIntoLines([item('a', 10, 100), item('b', 20, 98), item('c', 30, 96), item('d', 40, 94)], 1);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('nao deixa um item da coluna da direita, um pouco acima, partir a linha da esquerda', () => {
    // Geometria real: "PROGRAMA DE FIDELIDADE" (direita) em y=391,0; o nome do
    // titular em 388,5 e "Cartão" em 388,4. Comparando com o primeiro item, o
    // nome entra (2,5pt) mas "Cartão" fica de fora (2,6pt) e o cabecalho do
    // cartao se parte em duas linhas.
    const lines = groupIntoLines(
      [
        item('PROGRAMA DE FIDELIDADE', 364.3, 391.0),
        item('JOSE', 45.4, 388.5),
        item('Cartão', 209.7, 388.4),
        item('6550 XXXX XXXX 2020', 232.1, 388.4),
      ],
      2,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('JOSE Cartão 6550 XXXX XXXX 2020 PROGRAMA DE FIDELIDADE');
  });

  it('ignora itens vazios ou so com espacos', () => {
    const lines = groupIntoLines([item('  ', 10, 100), item('x', 20, 100), item('', 30, 100)], 1);
    expect(lines).toHaveLength(1);
    expect(lines[0].items).toHaveLength(1);
  });
});
