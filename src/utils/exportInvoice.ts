import * as XLSX from "xlsx";
import type { InvoiceItem, Invoice, CreditCard } from "@/hooks/useCreditCards";
import type { Share } from "@/lib/cards/split";
import { effectivePerson } from "@/lib/people";
import { isPaymentLine } from "@/lib/cards/mirror";

const fmtDate = (d: string) => d.split("-").reverse().join("/");

/**
 * Linhas da fatura para planilha: uma por lancamento (compras divididas viram
 * uma linha por parte, com o valor de cada pessoa) - o que o usuario precisa
 * para conferir ou lancar em outro lugar.
 */
export function invoiceRows(card: Pick<CreditCard, "nickname" | "last_four_digits">, invoice: Invoice, items: InvoiceItem[], splits: Record<string, Share[]>) {
  const rows: Record<string, string | number>[] = [];
  for (const item of items) {
    const base = {
      "Cartão": `${card.nickname} •••• ${card.last_four_digits}`,
      "Fatura (fechamento)": fmtDate(invoice.period_end),
      "Data": fmtDate(item.transaction_date),
      "Descrição": item.description,
      "Categoria": item.category ?? "",
      "Cartão do lançamento": item.card_last_four ?? "",
      "Titular do cartão": item.holder_name,
      "Parcela": item.installment_current && item.installment_total ? `${item.installment_current}/${item.installment_total}` : "",
      "Tipo": item.holder_name === "Pagamentos" || isPaymentLine(item.description) ? "Pagamento" : Number(item.amount) < 0 ? "Estorno/Crédito" : "Compra",
    };
    const parts = splits[item.id] ?? [];
    if (parts.length > 0) {
      for (const p of parts) rows.push({ ...base, "Responsável": p.person, "Valor (R$)": Number(p.amount), "Valor total da compra (R$)": Number(item.amount), "Dividida": "sim" });
    } else {
      rows.push({ ...base, "Responsável": effectivePerson(item), "Valor (R$)": Number(item.amount), "Valor total da compra (R$)": Number(item.amount), "Dividida": "" });
    }
  }
  return rows;
}

export function exportInvoice(
  card: Pick<CreditCard, "nickname" | "last_four_digits">,
  invoice: Invoice,
  items: InvoiceItem[],
  splits: Record<string, Share[]>,
  format: "xlsx" | "csv",
) {
  const rows = invoiceRows(card, invoice, items, splits);
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [14, 12, 10, 36, 20, 10, 24, 8, 12, 24, 12, 14, 8].map((w) => ({ wch: w }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Fatura");
  const name = `fatura-${card.last_four_digits}-${invoice.period_end}`;
  // CSV com ";" abre certo no Excel em portugues (virgula e o decimal).
  if (format === "csv") XLSX.writeFile(book, `${name}.csv`, { bookType: "csv", FS: ";" } as XLSX.WritingOptions);
  else XLSX.writeFile(book, `${name}.xlsx`);
}
