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

function parseBradescoPdf(text: string): { items: ParsedItem[]; previousBalance: number; error?: string } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];
  let previousBalance = 0;
  let currentHolder = '';

  // Pattern for holder: NAME followed by card number XXXX.XXXX.XXXX.NNNN
  const holderPattern = /^(.+?)\s+\d{4}\.\d{4}\.\d{4}\.\d{4}/;
  // Pattern for transaction: DD/MM DESCRIPTION VALUE
  const txPattern = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)$/;
  // Saldo anterior
  const saldoPattern = /saldo\s+anterior/i;
  
  for (const line of lines) {
    const holderMatch = line.match(holderPattern);
    if (holderMatch) {
      currentHolder = holderMatch[1].trim();
      continue;
    }

    if (saldoPattern.test(line)) {
      const valMatch = line.match(/([\d.,]+)\s*$/);
      if (valMatch) {
        previousBalance = parseFloat(valMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
      }
      continue;
    }

    const txMatch = line.match(txPattern);
    if (txMatch && currentHolder) {
      const dateStr = txMatch[1]; // DD/MM
      let desc = txMatch[2].trim();
      const amountStr = txMatch[3];
      const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 0;

      // Parse installment from description (e.g., "COMPRA 2/3")
      let instCurrent: number | null = null;
      let instTotal: number | null = null;
      const instMatch = desc.match(/(\d+)\/(\d+)/);
      if (instMatch) {
        const a = parseInt(instMatch[1]);
        const b = parseInt(instMatch[2]);
        // Only treat as installment if reasonable values
        if (a <= b && b <= 99) {
          instCurrent = a;
          instTotal = b;
        }
      }

      // Use current year for date
      const year = new Date().getFullYear();
      const [dd, mm] = dateStr.split('/');
      const isoDate = `${year}-${mm}-${dd}`;

      items.push({
        holder_name: currentHolder,
        transaction_date: isoDate,
        description: desc,
        amount,
        category: autoCategory(desc),
        installment_current: instCurrent,
        installment_total: instTotal,
      });
    }
  }

  if (items.length === 0) {
    return { items: [], previousBalance: 0, error: 'Não foi possível identificar lançamentos no PDF. Verifique se o formato é compatível com extratos do Bradesco.' };
  }

  return { items, previousBalance };
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
