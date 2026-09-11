import * as pdfjs from 'pdfjs-dist';
// O worker roda o parse do PDF fora da thread principal. O `?url` faz o Vite
// servir o arquivo como asset e devolver a URL final (com hash no build).
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { groupIntoLines } from './lines';
import type { PdfLine, PdfTextItem } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Le um PDF no navegador e devolve as linhas visuais de todas as paginas, na
 * ordem do documento. Funciona com PDFs comprimidos (FlateDecode), que e o
 * caso de praticamente todo PDF gerado hoje - inclusive a fatura do Bradesco.
 */
export async function extractPdfLines(data: ArrayBuffer): Promise<PdfLine[]> {
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await task.promise;
  try {
    const lines: PdfLine[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const item of content.items) {
        // TextMarkedContent nao tem texto; so TextItem interessa.
        if ('str' in item) items.push({ text: item.str, x: item.transform[4], y: item.transform[5] });
      }
      lines.push(...groupIntoLines(items, pageNumber));
      page.cleanup();
    }
    return lines;
  } finally {
    // Libera o worker e a memoria do documento; e a loading task que tem destroy().
    await task.destroy();
  }
}
