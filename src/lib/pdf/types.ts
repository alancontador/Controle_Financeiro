/** Um trecho de texto posicionado na pagina, como o pdf.js devolve. */
export interface PdfTextItem {
  text: string;
  /** Coordenada horizontal do inicio do trecho, em pontos. */
  x: number;
  /** Coordenada vertical da linha de base (origem no rodape da pagina). */
  y: number;
}

/** Uma linha visual da pagina: itens com a mesma altura, ordenados da esquerda para a direita. */
export interface PdfLine {
  page: number;
  y: number;
  items: PdfTextItem[];
  /** Itens unidos por espaco, na ordem horizontal. */
  text: string;
}
