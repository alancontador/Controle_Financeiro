import * as XLSX from "xlsx";
import { Investment, InvestmentClass } from "@/hooks/useInvestments";

interface ExportOptions {
  format: "csv" | "xlsx";
  fileName?: string;
}

const investmentTypeLabels: Record<string, string> = {
  stock_br: "Ações BR",
  stock_us: "Ações EUA",
  fixed_income: "Renda Fixa",
  reits: "FIIs",
  crypto: "Cripto",
  etf_br: "ETF BR",
  etf_us: "ETF EUA",
};

export function exportInvestments(
  investments: Investment[],
  investmentClasses: InvestmentClass[],
  options: ExportOptions
) {
  const { format, fileName = "portfolio" } = options;

  // Create a map for class names
  const classMap = investmentClasses.reduce((acc, cls) => {
    acc[cls.id] = cls.name;
    return acc;
  }, {} as Record<string, string>);

  // Prepare data for export
  const exportData = investments.map((inv) => {
    const totalValue = inv.quantity * inv.current_price;
    const totalCost = inv.quantity * inv.average_price;
    const profit = totalValue - totalCost;
    const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return {
      Ticker: inv.ticker,
      Nome: inv.name,
      Tipo: investmentTypeLabels[inv.type] || inv.type,
      Classe: inv.class_id ? classMap[inv.class_id] || "" : "",
      Quantidade: inv.quantity,
      "Preço Médio": inv.average_price,
      "Preço Atual": inv.current_price,
      "Valor Total": totalValue,
      "Custo Total": totalCost,
      "Lucro/Prejuízo": profit,
      "Rentabilidade (%)": profitPercent.toFixed(2),
      Moeda: inv.currency,
      Notas: inv.notes || "",
      "Data Criação": inv.created_at.split("T")[0],
      "Última Atualização": inv.updated_at.split("T")[0],
    };
  });

  // Calculate totals
  const totalInvested = investments.reduce((acc, inv) => {
    const cost = inv.quantity * inv.average_price;
    return acc + (inv.currency === "USD" ? cost * 5.0 : cost);
  }, 0);

  const totalCurrent = investments.reduce((acc, inv) => {
    const value = inv.quantity * inv.current_price;
    return acc + (inv.currency === "USD" ? value * 5.0 : value);
  }, 0);

  const totalProfit = totalCurrent - totalInvested;
  const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  // Add summary row (blank separator)
  const summaryRow1 = {
    Ticker: "",
    Nome: "",
    Tipo: "",
    Classe: "",
    Quantidade: "",
    "Preço Médio": "",
    "Preço Atual": "",
    "Valor Total": "",
    "Custo Total": "",
    "Lucro/Prejuízo": "",
    "Rentabilidade (%)": "",
    Moeda: "",
    Notas: "",
    "Data Criação": "",
    "Última Atualização": "",
  };

  const summaryRow2 = {
    Ticker: "TOTAL (BRL)",
    Nome: "",
    Tipo: "",
    Classe: "",
    Quantidade: "",
    "Preço Médio": "",
    "Preço Atual": "",
    "Valor Total": totalCurrent.toFixed(2),
    "Custo Total": totalInvested.toFixed(2),
    "Lucro/Prejuízo": totalProfit.toFixed(2),
    "Rentabilidade (%)": totalProfitPercent.toFixed(2),
    Moeda: "BRL",
    Notas: "Valores em USD convertidos com taxa de 5.00",
    "Data Criação": "",
    "Última Atualização": "",
  };

  // Create workbook and worksheet
  const allRows = [...exportData, summaryRow1, summaryRow2];
  const worksheet = XLSX.utils.json_to_sheet(allRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Portfólio");

  // Set column widths
  worksheet["!cols"] = [
    { wch: 12 }, // Ticker
    { wch: 25 }, // Nome
    { wch: 12 }, // Tipo
    { wch: 15 }, // Classe
    { wch: 12 }, // Quantidade
    { wch: 12 }, // Preço Médio
    { wch: 12 }, // Preço Atual
    { wch: 14 }, // Valor Total
    { wch: 14 }, // Custo Total
    { wch: 14 }, // Lucro/Prejuízo
    { wch: 14 }, // Rentabilidade
    { wch: 8 }, // Moeda
    { wch: 30 }, // Notas
    { wch: 12 }, // Data Criação
    { wch: 15 }, // Última Atualização
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

export function exportPortfolioHistory(
  history: { snapshot_date: string; total_value: number }[],
  options: ExportOptions
) {
  const { format, fileName = "historico_patrimonio" } = options;

  // Prepare data for export
  const exportData = history.map((h) => ({
    Data: h.snapshot_date,
    "Valor Total (R$)": h.total_value,
  }));

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico");

  // Set column widths
  worksheet["!cols"] = [
    { wch: 12 }, // Data
    { wch: 18 }, // Valor Total
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
