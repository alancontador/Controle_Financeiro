/** Numero -> "1.234,56" (sem R$), como o usuario digita. */
export function formatBRLInput(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1.234,56" | "1234.56" | "1234,5" -> 1234.56 (0 se vazio/invalido). */
export function parseBRL(text: string | number | null | undefined): number {
  if (typeof text === 'number') return Number.isFinite(text) ? text : 0;
  if (!text) return 0;
  let s = String(text).trim().replace(/[R$\s]/g, '');
  const neg = s.startsWith('-');
  s = s.replace('-', '');
  // Com virgula: virgula e o decimal e o ponto e milhar. Sem virgula e um so ponto: decimal.
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  const r = Math.round(n * 100) / 100;
  return neg ? -r : r;
}

/**
 * Mascara de digitacao "estilo caixa eletronico": so os digitos contam e os dois
 * ultimos sao os centavos. "123456" -> "1.234,56"; "" -> "".
 */
export function maskBRLDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10) / 100;
  return formatBRLInput(cents);
}
