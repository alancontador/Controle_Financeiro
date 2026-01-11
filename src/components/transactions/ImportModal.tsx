import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Category } from "@/hooks/useTransactions";

interface ParsedTransaction {
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  date: string;
  notes: string | null;
  isValid: boolean;
  errors: string[];
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Omit<ParsedTransaction, "isValid" | "errors">[]) => Promise<void>;
  categories: Category[];
  isLoading: boolean;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  categories,
  isLoading,
}: ImportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const findCategoryId = useCallback(
    (categoryName: string, type: "income" | "expense"): string | null => {
      if (!categoryName) return null;
      const normalizedName = categoryName.toLowerCase().trim();
      const found = categories.find(
        (c) => c.name.toLowerCase() === normalizedName && c.type === type
      );
      return found?.id || null;
    },
    [categories]
  );

  const parseDate = (value: unknown): string => {
    if (!value) return new Date().toISOString().split("T")[0];

    // Handle Excel serial date numbers
    if (typeof value === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date.toISOString().split("T")[0];
    }

    // Handle string dates
    if (typeof value === "string") {
      // Try DD/MM/YYYY format
      const brMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (brMatch) {
        const [, day, month, year] = brMatch;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }

      // Try YYYY-MM-DD format
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        return value;
      }

      // Try parsing as date string
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    }

    return new Date().toISOString().split("T")[0];
  };

  const parseAmount = (value: unknown): number => {
    if (typeof value === "number") return Math.abs(value);
    if (typeof value === "string") {
      // Remove currency symbols and handle Brazilian format
      const cleaned = value
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.abs(parsed);
    }
    return 0;
  };

  const parseType = (value: unknown): "income" | "expense" => {
    if (typeof value === "string") {
      const normalized = value.toLowerCase().trim();
      if (
        normalized === "receita" ||
        normalized === "income" ||
        normalized === "entrada" ||
        normalized === "crédito" ||
        normalized === "credito"
      ) {
        return "income";
      }
    }
    return "expense";
  };

  const processFile = useCallback(
    (file: File) => {
      setParseError(null);
      setFileName(file.name);

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let rows: Record<string, unknown>[] = [];

          if (file.name.endsWith(".csv")) {
            // Parse CSV
            const text = data as string;
            const workbook = XLSX.read(text, { type: "string" });
            const sheetName = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          } else {
            // Parse Excel
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          }

          if (rows.length === 0) {
            setParseError("O arquivo está vazio ou não contém dados válidos.");
            return;
          }

          // Map rows to transactions
          const transactions: ParsedTransaction[] = rows.map((row) => {
            const errors: string[] = [];

            // Get description (try multiple column names)
            const description = String(
              row["Descrição"] ||
                row["descrição"] ||
                row["Descricao"] ||
                row["descricao"] ||
                row["Description"] ||
                row["description"] ||
                row["Nome"] ||
                row["nome"] ||
                ""
            ).trim();

            if (!description) {
              errors.push("Descrição é obrigatória");
            }

            // Get amount
            const rawAmount =
              row["Valor"] ||
              row["valor"] ||
              row["Amount"] ||
              row["amount"] ||
              row["Quantia"] ||
              0;
            const amount = parseAmount(rawAmount);

            if (amount <= 0) {
              errors.push("Valor deve ser maior que zero");
            }

            // Get type
            const rawType =
              row["Tipo"] ||
              row["tipo"] ||
              row["Type"] ||
              row["type"] ||
              row["Categoria Tipo"] ||
              "expense";
            const type = parseType(rawType);

            // Get category
            const categoryName = String(
              row["Categoria"] ||
                row["categoria"] ||
                row["Category"] ||
                row["category"] ||
                ""
            ).trim();
            const category_id = findCategoryId(categoryName, type);

            // Get date
            const rawDate =
              row["Data"] ||
              row["data"] ||
              row["Date"] ||
              row["date"] ||
              new Date();
            const date = parseDate(rawDate);

            // Get notes
            const notes = String(
              row["Notas"] ||
                row["notas"] ||
                row["Notes"] ||
                row["notes"] ||
                row["Observações"] ||
                row["observações"] ||
                ""
            ).trim() || null;

            return {
              description,
              amount,
              type,
              category_id,
              date,
              notes,
              isValid: errors.length === 0,
              errors,
            };
          });

          setParsedData(transactions);
        } catch {
          setParseError(
            "Erro ao processar o arquivo. Verifique se é um CSV ou Excel válido."
          );
        }
      };

      reader.onerror = () => {
        setParseError("Erro ao ler o arquivo.");
      };

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    },
    [findCategoryId]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    const validTransactions = parsedData
      .filter((t) => t.isValid)
      .map(({ isValid, errors, ...rest }) => rest);

    if (validTransactions.length === 0) {
      return;
    }

    await onImport(validTransactions);
    handleClose();
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName(null);
    setParseError(null);
    onClose();
  };

  const validCount = parsedData.filter((t) => t.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Transações
          </DialogTitle>
          <DialogDescription>
            Importe transações de um arquivo CSV ou Excel (.xlsx, .xls)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!parsedData.length && !parseError && (
            <>
              {/* Drop zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-foreground font-medium mb-1">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Suporta CSV, XLSX e XLS
                </p>
              </div>

              {/* Template info */}
              <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-2">
                  Formato esperado:
                </p>
                <p>
                  O arquivo deve ter colunas como: <strong>Descrição</strong>,{" "}
                  <strong>Valor</strong>, <strong>Tipo</strong> (Receita/Despesa),{" "}
                  <strong>Categoria</strong>, <strong>Data</strong>,{" "}
                  <strong>Notas</strong>
                </p>
                <p className="mt-2">
                  Datas aceitas: DD/MM/AAAA ou AAAA-MM-DD
                </p>
              </div>
            </>
          )}

          {/* Parse error */}
          {parseError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{parseError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => {
                    setParseError(null);
                    setFileName(null);
                  }}
                >
                  Tentar novamente
                </Button>
              </div>
            </motion.div>
          )}

          {/* Parsed data preview */}
          <AnimatePresence>
            {parsedData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* File info */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{fileName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setParsedData([]);
                      setFileName(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Summary */}
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span>{validCount} válidas</span>
                  </div>
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <span>{invalidCount} com erros</span>
                    </div>
                  )}
                </div>

                {/* Preview list */}
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-4 space-y-2">
                    {parsedData.map((transaction, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          transaction.isValid
                            ? "bg-card border-border"
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {transaction.isValid ? (
                              <Check className="w-4 h-4 text-success shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">
                              {transaction.description || "(Sem descrição)"}
                            </span>
                          </div>
                          {!transaction.isValid && (
                            <p className="text-xs text-destructive mt-1 ml-6">
                              {transaction.errors.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p
                            className={`text-sm font-semibold ${
                              transaction.type === "income"
                                ? "text-success"
                                : "text-destructive"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "-"}R${" "}
                            {transaction.amount.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={validCount === 0 || isLoading}
                    className="glow-primary"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar {validCount} transação
                        {validCount !== 1 ? "ões" : ""}
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
