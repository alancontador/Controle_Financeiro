import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, AlertCircle } from 'lucide-react';

interface ParsedItem {
  holder_name: string;
  transaction_date: string;
  description: string;
  amount: number;
  category: string;
  installment_current: number | null;
  installment_total: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: any[], previousBalance: number) => void;
}

const CATEGORIES = [
  'Alimentação', 'Supermercado', 'Farmácia', 'Combustível', 'Vestuário',
  'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Outros',
];

function autoCategory(desc: string): string {
  const d = desc.toUpperCase();
  if (d.includes('SUPERMERCADO') || d.includes('SUPERMERC')) return 'Supermercado';
  if (d.includes('FARMACIA') || d.includes('DROGARIA') || d.includes('DROGA')) return 'Farmácia';
  if (d.includes('POSTO') || d.includes('SHELL') || d.includes('IPIRANGA') || d.includes('COMBUSTI')) return 'Combustível';
  if (d.includes('UBER') || d.includes('99') || d.includes('CABIFY')) return 'Transporte';
  if (d.includes('NETFLIX') || d.includes('SPOTIFY') || d.includes('DISNEY') || d.includes('AMAZON PRIME') || d.includes('HBO')) return 'Assinaturas';
  if (d.includes('RESTAUR') || d.includes('LANCHON') || d.includes('PADARIA') || d.includes('IFOOD') || d.includes('RAPPI')) return 'Alimentação';
  if (d.includes('SAUDE') || d.includes('HOSPITAL') || d.includes('CLINICA') || d.includes('MEDIC')) return 'Saúde';
  return 'Outros';
}

function parseBradescoPdf(text: string): { items: ParsedItem[]; previousBalance: number; totalFatura?: number; error?: string } {
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const items: ParsedItem[] = [];
  let previousBalance = 0;
  let totalFatura: number | undefined;
  let currentHolder = '';

  // Lines to ignore
  const ignorePatterns = [
    /^Data\s+Hist[oó]rico/i,
    /Moeda\s+de\s+origem/i,
    /^US\$/i,
    /Cota[çc][aã]o/i,
    /^Total\s+para\s+/i,
    /\d{4}\.\d{4}\.\d{4}\.\d{4}/,
    /Extrato\s+em\s+Aberto/i,
  ];

  const shouldIgnore = (line: string) => ignorePatterns.some(p => p.test(line));

  // Detect holder: line containing "- ELO" or similar card brand suffix
  const holderPattern = /^(.+?)\s*-\s*(ELO|VISA|MASTERCARD|MASTER|AMEX|HIPERCARD)/i;

  // Date pattern at start of line
  const datePattern = /^(\d{2}\/\d{2})\s*(.*)/;

  // Value pattern (monetary)
  const valuePattern = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;
  const valueExtract = /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

  // Total da fatura
  const totalFaturaPattern = /Total\s+da\s+Fatura\s+em\s+Real/i;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check total da fatura
    if (totalFaturaPattern.test(line)) {
      const valMatch = line.match(valueExtract);
      if (valMatch) {
        totalFatura = parseFloat(valMatch[1].replace(/\./g, '').replace(',', '.'));
      } else if (i + 1 < lines.length) {
        const nextVal = lines[i + 1].trim();
        if (valuePattern.test(nextVal)) {
          totalFatura = parseFloat(nextVal.replace(/\./g, '').replace(',', '.'));
          i++;
        }
      }
      i++;
      continue;
    }

    // Ignore lines
    if (shouldIgnore(line)) { i++; continue; }

    // Detect holder
    const holderMatch = line.match(holderPattern);
    if (holderMatch) {
      currentHolder = holderMatch[1].trim();
      i++;
      continue;
    }

    // Detect saldo anterior
    if (/saldo\s+anterior/i.test(line)) {
      const valMatch = line.match(valueExtract);
      if (valMatch) {
        previousBalance = parseFloat(valMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
      } else if (i + 1 < lines.length) {
        const nextVal = lines[i + 1].trim();
        if (valuePattern.test(nextVal)) {
          previousBalance = parseFloat(nextVal.replace(/\./g, '').replace(',', '.')) || 0;
          i++;
        }
      }
      i++;
      continue;
    }

    // Detect transaction starting with date
    const dateMatch = line.match(datePattern);
    if (dateMatch && currentHolder) {
      const dateStr = dateMatch[1];
      let descParts: string[] = [];
      const restOfLine = dateMatch[2]?.trim() || '';

      // Check if rest of line ends with a value
      const inlineVal = restOfLine.match(valueExtract);
      if (inlineVal) {
        // Value is on the same line
        const desc = restOfLine.replace(valueExtract, '').trim();
        if (desc) descParts.push(desc);
        const amount = parseFloat(inlineVal[1].replace(/\./g, '').replace(',', '.')) || 0;
        pushItem(items, currentHolder, dateStr, descParts.join(' '), amount);
        i++;
        continue;
      }

      // Value not on same line — accumulate description lines
      if (restOfLine) descParts.push(restOfLine);
      let j = i + 1;
      let foundValue = false;
      while (j < lines.length) {
        const nextLine = lines[j];
        // If next line is a new date, holder, or ignored, stop
        if (datePattern.test(nextLine) || holderPattern.test(nextLine) || totalFaturaPattern.test(nextLine)) break;
        if (shouldIgnore(nextLine)) { j++; continue; }

        const valM = nextLine.match(valueExtract);
        if (valM) {
          // Check if there's description before the value on this line
          const beforeVal = nextLine.replace(valueExtract, '').trim();
          if (beforeVal && !/saldo\s+anterior/i.test(beforeVal)) descParts.push(beforeVal);
          const amount = parseFloat(valM[1].replace(/\./g, '').replace(',', '.')) || 0;
          pushItem(items, currentHolder, dateStr, descParts.join(' '), amount);
          foundValue = true;
          j++;
          break;
        }

        // Pure value line
        if (valuePattern.test(nextLine.trim())) {
          const amount = parseFloat(nextLine.trim().replace(/\./g, '').replace(',', '.')) || 0;
          pushItem(items, currentHolder, dateStr, descParts.join(' '), amount);
          foundValue = true;
          j++;
          break;
        }

        // Otherwise it's part of the description
        descParts.push(nextLine);
        j++;
      }

      if (!foundValue && descParts.length > 0) {
        // No value found — skip this entry
      }
      i = j;
      continue;
    }

    i++;
  }

  if (items.length === 0) {
    console.warn('[ImportPdfModal] Nenhum lançamento identificado. Primeiras 50 linhas do texto extraído:');
    lines.slice(0, 50).forEach((l, idx) => console.log(`  ${idx + 1}: ${l}`));
    return { items: [], previousBalance: 0, error: 'Não foi possível identificar lançamentos no PDF. Verifique se o formato é compatível com extratos do Bradesco.' };
  }

  return { items, previousBalance, totalFatura };
}

function pushItem(items: ParsedItem[], holder: string, dateStr: string, desc: string, amount: number) {
  let instCurrent: number | null = null;
  let instTotal: number | null = null;
  const instMatch = desc.match(/(\d+)\/(\d+)/);
  if (instMatch) {
    const a = parseInt(instMatch[1]);
    const b = parseInt(instMatch[2]);
    if (a <= b && b <= 99 && a >= 1) {
      instCurrent = a;
      instTotal = b;
    }
  }

  const year = new Date().getFullYear();
  const [dd, mm] = dateStr.split('/');
  const isoDate = `${year}-${mm}-${dd}`;

  const isPrevBalance = /saldo\s+anterior/i.test(desc);

  items.push({
    holder_name: holder,
    transaction_date: isoDate,
    description: desc.trim(),
    amount,
    category: isPrevBalance ? 'Outros' : autoCategory(desc),
    installment_current: instCurrent,
    installment_total: instTotal,
  });
}

export function ImportPdfModal({ open, onClose, onConfirm }: Props) {
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      // Use FileReader to read the PDF as text (basic extraction)
      // For proper PDF parsing we'll extract text using a simple approach
      const text = await extractTextFromPdf(file);
      const result = parseBradescoPdf(text);
      
      if (result.error) {
        setError(result.error);
      } else {
        setItems(result.items);
        setPreviousBalance(result.previousBalance);
      }
    } catch (err: any) {
      setError('Erro ao processar o PDF: ' + (err.message || 'formato incompatível'));
    }
    setLoading(false);
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    // Basic PDF text extraction - reads the raw content
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Try to extract text from PDF stream objects
    let text = '';
    const decoder = new TextDecoder('latin1');
    const rawText = decoder.decode(bytes);
    
    // Extract text between BT and ET markers (PDF text objects)
    const textBlocks = rawText.match(/BT[\s\S]*?ET/g) || [];
    for (const block of textBlocks) {
      // Extract text from Tj and TJ operators
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
      for (const m of tjMatches) {
        const content = m.match(/\(([^)]*)\)/)?.[1] || '';
        text += content + '\n';
      }
      // TJ array operator
      const tjArrays = block.match(/\[([^\]]*)\]\s*TJ/g) || [];
      for (const arr of tjArrays) {
        const strings = arr.match(/\(([^)]*)\)/g) || [];
        for (const s of strings) {
          text += s.replace(/[()]/g, '');
        }
        text += '\n';
      }
    }

    // Fallback: try extracting readable text directly
    if (!text.trim()) {
      // Extract any readable strings
      const readable = rawText.match(/[\w\d\s.,;:!?/\-àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ]{4,}/g) || [];
      text = readable.join('\n');
    }

    return text;
  };

  const updateItemCategory = (index: number, category: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, category } : item));
  };

  const updateItemDesc = (index: number, description: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, description } : item));
  };

  const handleConfirm = () => {
    const mapped = items.map(item => ({
      holder_name: item.holder_name,
      transaction_date: item.transaction_date,
      description: item.description,
      amount: item.amount,
      category: item.category,
      installment_current: item.installment_current,
      installment_total: item.installment_total,
      is_previous_balance: false,
    }));
    onConfirm(mapped, previousBalance);
    setItems([]);
    setPreviousBalance(0);
    onClose();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}`;
  };

  // Group by holder
  const grouped = items.reduce<Record<string, ParsedItem[]>>((acc, item) => {
    if (!acc[item.holder_name]) acc[item.holder_name] = [];
    acc[item.holder_name].push(item);
    return acc;
  }, {});

  const total = items.reduce((s, i) => s + i.amount, 0) + previousBalance;

  return (
    <Dialog open={open} onOpenChange={() => { setItems([]); setError(''); onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Extrato PDF (Bradesco)</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={loading}>
            <Upload className="w-4 h-4 mr-1" /> {loading ? 'Processando...' : 'Selecionar PDF'}
          </Button>
          <Input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-destructive flex items-start gap-1">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <>
            {previousBalance > 0 && (
              <div className="bg-muted rounded-lg p-3 mb-4">
                <p className="text-sm font-medium">Saldo Anterior: {fmt(previousBalance)}</p>
              </div>
            )}

            {Object.entries(grouped).map(([holder, hItems]) => {
              const holderTotal = hItems.reduce((s, i) => s + i.amount, 0);
              const startIndex = items.indexOf(hItems[0]);
              return (
                <div key={holder} className="mb-6">
                  <h3 className="font-semibold text-foreground mb-2">{holder}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Categoria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hItems.map((item, idx) => {
                        const globalIdx = startIndex + idx;
                        return (
                          <TableRow key={idx}>
                            <TableCell>{fmtDate(item.transaction_date)}</TableCell>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={e => updateItemDesc(globalIdx, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              {item.installment_current && item.installment_total
                                ? `${item.installment_current}/${item.installment_total}`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">{fmt(item.amount)}</TableCell>
                            <TableCell>
                              <Select value={item.category} onValueChange={v => updateItemCategory(globalIdx, v)}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <p className="text-sm font-medium text-right mt-1">Total {holder}: {fmt(holderTotal)}</p>
                </div>
              );
            })}

            <div className="border-t pt-4 flex justify-between items-center">
              <p className="font-bold text-lg">Total Geral: {fmt(total)}</p>
              <Button onClick={handleConfirm}>Confirmar Importação</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
