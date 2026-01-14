import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Investment, InvestmentClass } from "@/hooks/useInvestments";

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'investment_class'>) => void;
  investment?: Investment | null;
  investmentClasses: InvestmentClass[];
}

const investmentTypes = [
  { value: 'stock_br', label: 'Ações BR' },
  { value: 'stock_us', label: 'Ações EUA' },
  { value: 'fixed_income', label: 'Renda Fixa' },
  { value: 'reits', label: 'FIIs' },
  { value: 'crypto', label: 'Cripto' },
  { value: 'etf_br', label: 'ETF BR' },
  { value: 'etf_us', label: 'ETF EUA' },
] as const;

export function InvestmentModal({ isOpen, onClose, onSave, investment, investmentClasses }: InvestmentModalProps) {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<Investment['type']>('stock_br');
  const [classId, setClassId] = useState<string>('');
  const [quantity, setQuantity] = useState('0');
  const [averagePrice, setAveragePrice] = useState('0');
  const [currentPrice, setCurrentPrice] = useState('0');
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (investment) {
      setTicker(investment.ticker);
      setName(investment.name);
      setType(investment.type);
      setClassId(investment.class_id || 'none');
      setQuantity(investment.quantity.toString());
      setAveragePrice(investment.average_price.toString());
      setCurrentPrice(investment.current_price.toString());
      setCurrency(investment.currency);
      setNotes(investment.notes || '');
    } else {
      setTicker('');
      setName('');
      setType('stock_br');
      setClassId('none');
      setQuantity('0');
      setAveragePrice('0');
      setCurrentPrice('0');
      setCurrency('BRL');
      setNotes('');
    }
  }, [investment, isOpen]);

  // Auto-set currency based on type
  useEffect(() => {
    if (type === 'stock_us' || type === 'etf_us') {
      setCurrency('USD');
    } else {
      setCurrency('BRL');
    }
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ticker: ticker.toUpperCase(),
      name,
      type,
      class_id: classId === 'none' ? null : classId,
      quantity: parseFloat(quantity) || 0,
      average_price: parseFloat(averagePrice) || 0,
      current_price: parseFloat(currentPrice) || 0,
      currency,
      notes: notes || null,
    });
    onClose();
  };

  const totalValue = (parseFloat(quantity) || 0) * (parseFloat(currentPrice) || 0);
  const totalCost = (parseFloat(quantity) || 0) * (parseFloat(averagePrice) || 0);
  const gain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {investment ? 'Editar Ativo' : 'Novo Ativo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker/Código</Label>
              <Input
                id="ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="PETR4, AAPL..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as Investment['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {investmentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Ativo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Petrobras PN, Apple Inc..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">Classe de Ativo</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma classe (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {investmentClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cls.color }}
                      />
                      {cls.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                step="0.00000001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as 'BRL' | 'USD')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">R$ (BRL)</SelectItem>
                  <SelectItem value="USD">$ (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="averagePrice">Preço Médio</Label>
              <Input
                id="averagePrice"
                type="number"
                step="0.01"
                min="0"
                value={averagePrice}
                onChange={(e) => setAveragePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPrice">Preço Atual</Label>
              <Input
                id="currentPrice"
                type="number"
                step="0.01"
                min="0"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Summary */}
          {totalValue > 0 && (
            <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Total</span>
                <span className="font-semibold text-foreground">
                  {currency === 'BRL' ? 'R$' : '$'} {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo Total</span>
                <span className="text-foreground">
                  {currency === 'BRL' ? 'R$' : '$'} {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resultado</span>
                <span className={gain >= 0 ? 'text-accent' : 'text-destructive'}>
                  {gain >= 0 ? '+' : ''}{currency === 'BRL' ? 'R$' : '$'} {gain.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({gainPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o investimento..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {investment ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}