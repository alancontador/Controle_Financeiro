import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreditCard } from '@/hooks/useCreditCards';

interface CardModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  card?: CreditCard | null;
}

const BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outro'];

export function CardModal({ open, onClose, onSave, card }: CardModalProps) {
  const [nickname, setNickname] = useState('');
  const [brand, setBrand] = useState('Visa');
  const [issuerBank, setIssuerBank] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [totalLimit, setTotalLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [holderName, setHolderName] = useState('');

  useEffect(() => {
    if (card) {
      setNickname(card.nickname);
      setBrand(card.brand);
      setIssuerBank(card.issuer_bank);
      setLastFour(card.last_four_digits);
      setTotalLimit(card.total_limit.toString());
      setClosingDay(card.closing_day.toString());
      setDueDay(card.due_day.toString());
      setHolderName('');
    } else {
      setNickname(''); setBrand('Visa'); setIssuerBank(''); setLastFour('');
      setTotalLimit(''); setClosingDay(''); setDueDay(''); setHolderName('');
    }
  }, [card, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitValue = parseFloat(totalLimit.replace(/\./g, '').replace(',', '.')) || 0;
    onSave({
      nickname,
      brand,
      issuer_bank: issuerBank,
      last_four_digits: lastFour,
      total_limit: limitValue,
      closing_day: parseInt(closingDay) || 1,
      due_day: parseInt(dueDay) || 1,
      holder_name: holderName,
    });
    onClose();
  };

  const formatMoney = (val: string) => {
    const num = val.replace(/\D/g, '');
    if (!num) return '';
    const cents = parseInt(num) / 100;
    return cents.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{card ? 'Editar Cartão' : 'Cadastrar Cartão'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Apelido</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} required placeholder="Ex: Cartão Principal" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bandeira</Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Banco Emissor</Label>
              <Input value={issuerBank} onChange={e => setIssuerBank(e.target.value)} required placeholder="Ex: Bradesco" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Últimos 4 Dígitos</Label>
              <Input value={lastFour} onChange={e => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} required maxLength={4} placeholder="1234" />
            </div>
            <div>
              <Label>Limite Total (R$)</Label>
              <Input
                value={totalLimit}
                onChange={e => setTotalLimit(formatMoney(e.target.value))}
                required
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dia de Fechamento</Label>
              <Input type="number" min={1} max={31} value={closingDay} onChange={e => setClosingDay(e.target.value)} required />
            </div>
            <div>
              <Label>Dia de Vencimento</Label>
              <Input type="number" min={1} max={31} value={dueDay} onChange={e => setDueDay(e.target.value)} required />
            </div>
          </div>
          {!card && (
            <div>
              <Label>Nome do Titular Principal</Label>
              <Input value={holderName} onChange={e => setHolderName(e.target.value)} required placeholder="Nome completo" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
