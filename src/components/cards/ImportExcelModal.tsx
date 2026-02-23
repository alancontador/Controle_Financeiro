import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { CardHolder } from '@/hooks/useCreditCards';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: any[]) => void;
  holders: CardHolder[];
}

const CATEGORIES = [
  'Alimentação', 'Supermercado', 'Farmácia', 'Combustível', 'Vestuário',
  'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Outros',
];

interface ParsedRow {
  holder_name: string;
  transaction_date: string;
  description: string;
  installment_current: number | null;
  installment_total: number | null;
  amount: number;
  category: string;
  error?: string;
}

export function ImportExcelModal({ open, onClose, onConfirm, holders }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const holderNames = holders.map(h => h.holder_name.toLowerCase());

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Titular', 'Data', 'Descrição', 'Parcela Atual', 'Total de Parcelas', 'Valor (R$)', 'Categoria'],
      ['João Silva', '15/03/2025', 'Supermercado Extra', '', '', '150,00', 'Supermercado'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_lancamentos.xlsx');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

      const parsed: ParsedRow[] = [];
      const errs: string[] = [];

      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const titular = String(row[0] || '').trim();
        const dataStr = String(row[1] || '').trim();
        const desc = String(row[2] || '').trim();
        const parcAtual = row[3] ? parseInt(String(row[3])) : null;
        const parcTotal = row[4] ? parseInt(String(row[4])) : null;
        const valorStr = String(row[5] || '0');
        const cat = String(row[6] || 'Outros').trim();

        // Validate holder
        if (!holderNames.includes(titular.toLowerCase())) {
          errs.push(`Linha ${i + 1}: Titular "${titular}" não encontrado no cartão.`);
        }

        // Parse date
        let isoDate = '';
        if (dataStr.includes('/')) {
          const parts = dataStr.split('/');
          if (parts.length === 3) isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (typeof row[1] === 'number') {
          // Excel date serial
          const d = new Date((row[1] - 25569) * 86400 * 1000);
          isoDate = d.toISOString().split('T')[0];
        }
        if (!isoDate) errs.push(`Linha ${i + 1}: Data inválida "${dataStr}".`);

        // Parse amount
        let amount = 0;
        const cleaned = valorStr.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        amount = parseFloat(cleaned) || 0;
        if (amount <= 0) errs.push(`Linha ${i + 1}: Valor inválido "${valorStr}".`);

        // Validate category
        const validCat = CATEGORIES.includes(cat) ? cat : 'Outros';
        if (!CATEGORIES.includes(cat)) errs.push(`Linha ${i + 1}: Categoria "${cat}" inválida, usando "Outros".`);

        parsed.push({
          holder_name: titular,
          transaction_date: isoDate,
          description: desc,
          installment_current: parcAtual,
          installment_total: parcTotal,
          amount,
          category: validCat,
        });
      }

      setRows(parsed);
      setErrors(errs);
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirm = () => {
    const items = rows.map(r => ({
      holder_name: r.holder_name,
      transaction_date: r.transaction_date,
      description: r.description,
      amount: r.amount,
      category: r.category,
      installment_current: r.installment_current,
      installment_total: r.installment_total,
      is_previous_balance: false,
    }));
    onConfirm(items);
    setRows([]);
    setErrors([]);
    onClose();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <Dialog open={open} onOpenChange={() => { setRows([]); setErrors([]); onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar via Excel/CSV</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-1" /> Baixar Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Upload Arquivo
          </Button>
          <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </div>

        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 space-y-1">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-destructive flex items-start gap-1">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {e}
              </p>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titular</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.holder_name}</TableCell>
                    <TableCell>{fmtDate(r.transaction_date)}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>{r.installment_current && r.installment_total ? `${r.installment_current}/${r.installment_total}` : '-'}</TableCell>
                    <TableCell className="text-right">{fmt(r.amount)}</TableCell>
                    <TableCell>{r.category}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4">
              <p className="font-semibold">Total: {fmt(total)}</p>
              <Button onClick={handleConfirm}>Confirmar Importação</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
