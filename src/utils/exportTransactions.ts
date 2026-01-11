import * as XLSX from "xlsx";
import { Transaction } from "@/hooks/useTransactions";

interface ExportOptions {
  format: "csv" | "xlsx";
  fileName?: string;
}

export function exportTransactions(
  transactions: Transaction[],
  options: ExportOptions
) {
  const { format, fileName = "transacoes" } = options;

  // Prepare data for export
  const exportData = transactions.map((t) => ({
    Descrição: t.description,
    Valor: t.amount,
    Tipo: t.type === "income" ? "Receita" : "Despesa",
    Categoria: t.category?.name || "",
    Data: t.date,
    Notas: t.notes || "",
  }));

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");

  // Set column widths
  worksheet["!cols"] = [
    { wch: 30 }, // Descrição
    { wch: 12 }, // Valor
    { wch: 10 }, // Tipo
    { wch: 15 }, // Categoria
    { wch: 12 }, // Data
    { wch: 30 }, // Notas
  ];

  // Generate file
  const dateStr = new Date().toISOString().split("T")[0];
  const fullFileName = `${fileName}_${dateStr}`;

  if (format === "csv") {
    XLSX.writeFile(workbook, `${fullFileName}.csv`, { bookType: "csv" });
  } else {
    XLSX.writeFile(workbook, `${fullFileName}.xlsx`, { bookType: "xlsx" });
  }
}
