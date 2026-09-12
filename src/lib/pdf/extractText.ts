import * as pdfjs from 'pdfjs-dist';
// O worker roda o parse do PDF fora da thread principal. O `?url` faz o Vite
// servir o arquivo como asset e devolver a URL final (com hash no build).
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { groupIntoLines } from './lines';
import type { PdfLine, PdfTextItem } from './types';

// A versao na query serve para duas coisas: o worker precisa casar com a versao
// da API, e a URL diferente invalida qualquer cache (ou module map da aba) que
// tenha guardado o arquivo servido com MIME errado antes do ajuste do nginx.
pdfjs.GlobalWorkerOptions.workerSrc = `${workerUrl}?v=${pdfjs.version}`;

/**
 * Le um PDF no navegador e devolve as linhas visuais de todas as paginas, na
 * ordem do documento. Funciona com PDFs comprimidos (FlateDecode), que e o
 * caso de praticamente todo PDF gerado hoje - inclusive a fatura do Bradesco.
 */
export async function extractPdfLines(data: ArrayBuffer): Promise<PdfLine[]> {
  const task = pdfjs.getDocument({ data: trimToPdfHeader(new Uint8Array(data)) });
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

/**
 * Alguns apps gravam lixo antes do cabecalho do PDF (a fatura do Inter veio
 * com ~400 KB de bytes zero na frente), e o pdf.js so tolera lixo curto
 * ("Invalid Root reference"). Corta tudo que vier antes de "%PDF".
 */
export function trimToPdfHeader(bytes: Uint8Array): Uint8Array {
  const header = [0x25, 0x50, 0x44, 0x46]; // %PDF
  for (let i = 0; i + header.length <= bytes.length; i++) {
    if (bytes[i] === header[0] && bytes[i + 1] === header[1] && bytes[i + 2] === header[2] && bytes[i + 3] === header[3]) {
      return i === 0 ? bytes : bytes.subarray(i);
    }
  }
  return bytes;
}
