import type { PdfLine, PdfTextItem } from './types';

/**
 * Tolerancia vertical para dois itens serem considerados a mesma linha.
 *
 * O pdf.js devolve o sinal de menos de um estorno como item separado, cerca de
 * 1,2pt abaixo do valor. Com tolerancia menor que isso o sinal cai em outra
 * linha e o credito e importado como debito.
 */
const Y_TOLERANCE = 2.5;

/**
 * Agrupa os itens de texto de uma pagina em linhas visuais, de cima para baixo,
 * com os itens de cada linha da esquerda para a direita.
 *
 * A comparacao e com a altura MEDIA dos itens ja na linha, nao com o primeiro
 * nem com o ultimo:
 * - com o primeiro, um item da coluna da direita um pouco acima vira a
 *   referencia e parte a linha da esquerda ao meio (o nome do titular entra,
 *   "Cartão" a 0,1pt dele fica de fora);
 * - com o ultimo, uma sequencia de itens cada um "quase" na altura do
 *   anterior vai se fundindo numa linha so.
 * A media acompanha a maioria dos itens da linha e resiste aos dois casos.
 */
export function groupIntoLines(items: PdfTextItem[], page: number): PdfLine[] {
  const sorted = items
    .filter((i) => i.text.trim().length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: PdfLine[] = [];
  let current: PdfLine | null = null;
  let ySum = 0;

  for (const item of sorted) {
    if (current && Math.abs(item.y - ySum / current.items.length) <= Y_TOLERANCE) {
      current.items.push(item);
      ySum += item.y;
    } else {
      current = { page, y: item.y, items: [item], text: '' };
      ySum = item.y;
      lines.push(current);
    }
  }

  for (const line of lines) {
    line.y = line.items.reduce((acc, i) => acc + i.y, 0) / line.items.length;
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map((i) => i.text.trim()).join(' ');
  }

  return lines;
}
