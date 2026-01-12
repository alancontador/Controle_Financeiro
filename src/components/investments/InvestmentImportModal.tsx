import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2, Download } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Investment, InvestmentClass } from "@/hooks/useInvestments";

interface ParsedInvestment {
  ticker: string;
  name: string;
  type: Investment['type'];
  class_id: string | null;
  quantity: number;
  average_price: number;
  current_price: number;
  currency: 'BRL' | 'USD';
  notes: string | null;
  isValid: boolean;
  errors: string[];
}

interface InvestmentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (investments: Omit<ParsedInvestment, "isValid" | "errors">[]) => Promise<void>;
  investmentClasses: InvestmentClass[];
  isLoading: boolean;
}

const typeLabels: Record<Investment['type'], string> = {
  stock_br: 'Ações BR',
  stock_us: 'Ações EUA',
  fixed_income: 'Renda Fixa',
  reits: 'FIIs',
  crypto: 'Cripto',
  etf_br: 'ETF BR',
  etf_us: 'ETF EUA',
};

const typeAliases: Record<string, Investment['type']> = {
  'ações br': 'stock_br',
  'acoes br': 'stock_br',
  'acao br': 'stock_br',
  'ação br': 'stock_br',
  'stock_br': 'stock_br',
  'br stocks': 'stock_br',
  'bovespa': 'stock_br',
  'b3': 'stock_br',
  
  'ações eua': 'stock_us',
  'acoes eua': 'stock_us',
  'ação eua': 'stock_us',
  'acao eua': 'stock_us',
  'stock_us': 'stock_us',
  'us stocks': 'stock_us',
  'nyse': 'stock_us',
  'nasdaq': 'stock_us',
  
  'renda fixa': 'fixed_income',
  'fixed income': 'fixed_income',
  'fixed_income': 'fixed_income',
  'cdb': 'fixed_income',
  'lci': 'fixed_income',
  'lca': 'fixed_income',
  'tesouro': 'fixed_income',
  
  'fii': 'reits',
  'fiis': 'reits',
  'fundos imobiliários': 'reits',
  'fundos imobiliarios': 'reits',
  'reits': 'reits',
  
  'cripto': 'crypto',
  'crypto': 'crypto',
  'criptomoeda': 'crypto',
  'bitcoin': 'crypto',
  
  'etf br': 'etf_br',
  'etf_br': 'etf_br',
  'etf brasil': 'etf_br',
  
  'etf eua': 'etf_us',
  'etf_us': 'etf_us',
  'etf usa': 'etf_us',
};

export function InvestmentImportModal({
  isOpen,
  onClose,
  onImport,
  investmentClasses,
  isLoading,
}: InvestmentImportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvestment[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const findClassId = useCallback(
    (className: string): string | null => {
      if (!className) return null;
      const normalizedName = className.toLowerCase().trim();
      const found = investmentClasses.find(
        (c) => c.name.toLowerCase() === normalizedName
      );
      return found?.id || null;
    },
    [investmentClasses]
  );

  const parseType = (value: unknown): Investment['type'] => {
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return typeAliases[normalized] || 'stock_br';
    }
    return 'stock_br';
  };

  const parseAmount = (value: unknown): number => {
    if (typeof value === "number") return Math.abs(value);
    if (typeof value === "string") {
      const cleaned = value
        .replace(/[R$\s$]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.abs(parsed);
    }
    return 0;
  };

  const parseQuantity = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/\./g, "").replace(",", ".");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const parseCurrency = (value: unknown): 'BRL' | 'USD' => {
    if (typeof value === 'string') {
      const normalized = value.toUpperCase().trim();
      if (normalized === 'USD' || normalized === 'DOLAR' || normalized === 'DÓLAR' || normalized === '$') {
        return 'USD';
      }
    }
    return 'BRL';
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
            const text = data as string;
            const workbook = XLSX.read(text, { type: "string" });
            const sheetName = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          } else {
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          }

          if (rows.length === 0) {
            setParseError("O arquivo está vazio ou não contém dados válidos.");
            return;
          }

          const investments: ParsedInvestment[] = rows.map((row) => {
            const errors: string[] = [];

            // Get ticker
            const ticker = String(
              row["Ticker"] ||
                row["ticker"] ||
                row["Código"] ||
                row["codigo"] ||
                row["Ativo"] ||
                row["ativo"] ||
                row["Symbol"] ||
                row["symbol"] ||
                ""
            ).trim().toUpperCase();

            if (!ticker) {
              errors.push("Ticker é obrigatório");
            }

            // Get name
            const name = String(
              row["Nome"] ||
                row["nome"] ||
                row["Name"] ||
                row["name"] ||
                row["Descrição"] ||
                row["descricao"] ||
                ticker
            ).trim();

            // Get type
            const rawType =
              row["Tipo"] ||
              row["tipo"] ||
              row["Type"] ||
              row["type"] ||
              row["Classe"] ||
              row["classe"] ||
              "stock_br";
            const type = parseType(rawType);

            // Get class
            const className = String(
              row["Classe Ativo"] ||
                row["classe ativo"] ||
                row["Asset Class"] ||
                row["Categoria"] ||
                row["categoria"] ||
                ""
            ).trim();
            const class_id = findClassId(className);

            // Get quantity
            const rawQuantity =
              row["Quantidade"] ||
              row["quantidade"] ||
              row["Quantity"] ||
              row["quantity"] ||
              row["Qtd"] ||
              row["qtd"] ||
              0;
            const quantity = parseQuantity(rawQuantity);

            if (quantity <= 0) {
              errors.push("Quantidade deve ser maior que zero");
            }

            // Get average price
            const rawAvgPrice =
              row["Preço Médio"] ||
              row["preco medio"] ||
              row["Preço médio"] ||
              row["PM"] ||
              row["pm"] ||
              row["Average Price"] ||
              row["Custo"] ||
              row["custo"] ||
              0;
            const average_price = parseAmount(rawAvgPrice);

            if (average_price <= 0) {
              errors.push("Preço médio deve ser maior que zero");
            }

            // Get current price (use average if not provided)
            const rawCurrentPrice =
              row["Preço Atual"] ||
              row["preco atual"] ||
              row["Current Price"] ||
              row["Cotação"] ||
              row["cotacao"] ||
              row["cotação"] ||
              rawAvgPrice;
            const current_price = parseAmount(rawCurrentPrice);

            // Get currency
            const rawCurrency =
              row["Moeda"] ||
              row["moeda"] ||
              row["Currency"] ||
              row["currency"] ||
              (type === 'stock_us' || type === 'etf_us' ? 'USD' : 'BRL');
            const currency = parseCurrency(rawCurrency);

            // Get notes
            const notes = String(
              row["Notas"] ||
                row["notas"] ||
                row["Notes"] ||
                row["notes"] ||
                row["Observações"] ||
                row["observacoes"] ||
                ""
            ).trim() || null;

            return {
              ticker,
              name,
              type,
              class_id,
              quantity,
              average_price,
              current_price,
              currency,
              notes,
              isValid: errors.length === 0,
              errors,
            };
          });

          setParsedData(investments);
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
    [findClassId]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
      }
    },
    [processFile]
  );

  const handleImport = async () => {
    const validInvestments = parsedData
      .filter((inv) => inv.isValid)
      .map(({ isValid, errors, ...rest }) => rest);

    if (validInvestments.length === 0) return;

    await onImport(validInvestments);
    handleClose();
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName(null);
    setParseError(null);
    onClose();
  };

  const downloadTemplate = () => {
    const template = [
      {
        Ticker: "PETR4",
        Nome: "Petrobras PN",
        Tipo: "Ações BR",
        Quantidade: 100,
        "Preço Médio": 35.50,
        "Preço Atual": 38.20,
        Moeda: "BRL",
        Notas: "Compra janeiro 2024",
      },
      {
        Ticker: "AAPL",
        Nome: "Apple Inc",
        Tipo: "Ações EUA",
        Quantidade: 10,
        "Preço Médio": 180.00,
        "Preço Atual": 195.50,
        Moeda: "USD",
        Notas: "",
      },
      {
        Ticker: "XPLG11",
        Nome: "XP Log FII",
        Tipo: "FIIs",
        Quantidade: 50,
        "Preço Médio": 95.00,
        "Preço Atual": 92.30,
        Moeda: "BRL",
        Notas: "",
      },
      {
        Ticker: "BTC",
        Nome: "Bitcoin",
        Tipo: "Cripto",
        Quantidade: 0.05,
        "Preço Médio": 350000.00,
        "Preço Atual": 520000.00,
        Moeda: "BRL",
        Notas: "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Investimentos");
    XLSX.writeFile(wb, "modelo_importacao_investimentos.xlsx");
  };

  const validCount = parsedData.filter((inv) => inv.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Investimentos</DialogTitle>
          <DialogDescription>
            Importe seus ativos de um arquivo CSV ou Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div>
              <p className="text-sm font-medium text-foreground">Modelo de importação</p>
              <p className="text-xs text-muted-foreground">
                Baixe o modelo para ver o formato esperado
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1" />
              Baixar Modelo
            </Button>
          </div>

          {/* File Drop Zone */}
          {parsedData.length === 0 && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
              `}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Arraste um arquivo ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    CSV, XLSX ou XLS (máx. 20MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{parseError}</span>
            </motion.div>
          )}

          {/* Parsed Data Preview */}
          <AnimatePresence>
            {parsedData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* File Info */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{fileName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
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
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm text-foreground">
                      {validCount} válidos
                    </span>
                  </div>
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-foreground">
                        {invalidCount} com erros
                      </span>
                    </div>
                  )}
                </div>

                {/* Data Preview */}
                <ScrollArea className="h-64 rounded-lg border border-border">
                  <div className="p-2 space-y-2">
                    {parsedData.map((inv, index) => (
                      <div
                        key={index}
                        className={`
                          p-3 rounded-lg text-sm
                          ${inv.isValid ? "bg-secondary/30" : "bg-destructive/10"}
                        `}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{inv.ticker}</span>
                            <Badge variant="secondary" className="text-xs">
                              {typeLabels[inv.type]}
                            </Badge>
                          </div>
                          <span className="text-foreground font-medium">
                            {inv.quantity} x {inv.currency === 'BRL' ? 'R$' : '$'} {inv.average_price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">{inv.name}</p>
                        {inv.errors.length > 0 && (
                          <div className="mt-2 text-xs text-destructive">
                            {inv.errors.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Importar {validCount > 0 && `(${validCount})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}