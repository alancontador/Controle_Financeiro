import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CardHolder } from '@/hooks/useCreditCards';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
  holders: CardHolder[];
}

const CATEGORIES = [
  'Alimentação', 'Supermercado', 'Farmácia', 'Combustível', 'Vestuário',
  'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Outros',
];

export function AddItemModal({ open, onClose, onSave, holders }: Props) {
  const [holderName, setHolderName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Outros');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCurrent, setInstallmentCurrent] = useState('1');
  const [installmentTotal, setInstallmentTotal] = useState('');

  const reset = () => {
    setHolderName(''); setDate(''); setDescription(''); setAmount('');
    setCategory('Outros'); setIsInstallment(false); setInstallmentCurrent('1'); setInstallmentTotal('');
  };

  const formatMoney = (val: string) => {
    const num = val.replace(/\D/g, '');
    if (!num) return '';
    const cents = parseInt(num) / 100;
    return cents.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
    
    // Convert DD/MM/YYYY or YYYY-MM-DD to ISO date
    let isoDate = date;
    if (date.includes('/')) {
      const [d, m, y] = date.split('/');
      isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    onSave({
      holder_name: holderName,
      transaction_date: isoDate,
      description,
      amount: amountVal,
      category,
      installment_current: isInstallment ? parseInt(installmentCurrent) || null : null,
      installment_total: isInstallment ? parseInt(installmentTotal) || null : null,
      is_previous_balance: false,
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titular</Label>
            <Select value={holderName} onValueChange={setHolderName}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {holders.map(h => <SelectItem key={h.id} value={h.holder_name}>{h.holder_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input value={amount} onChange={e => setAmount(formatMoney(e.target.value))} required placeholder="0,00" />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
            <Label>Parcelado?</Label>
          </div>
          {isInstallment && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Parcela Atual</Label>
                <Input type="number" min={1} value={installmentCurrent} onChange={e => setInstallmentCurrent(e.target.value)} />
              </div>
              <div>
                <Label>Total de Parcelas</Label>
                <Input type="number" min={1} value={installmentTotal} onChange={e => setInstallmentTotal(e.target.value)} required />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
