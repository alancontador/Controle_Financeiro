import { CreditCard as CreditCardIcon, Edit, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { CreditCard } from '@/hooks/useCreditCards';

interface Props {
  card: CreditCard;
  usedAmount: number;
  onEdit: () => void;
  onViewInvoices: () => void;
}

const brandColors: Record<string, string> = {
  Visa: 'from-blue-600 to-blue-800',
  Mastercard: 'from-red-600 to-orange-500',
  Elo: 'from-yellow-500 to-yellow-700',
  Amex: 'from-emerald-600 to-emerald-800',
  Hipercard: 'from-red-500 to-red-700',
  Outro: 'from-gray-600 to-gray-800',
};

export function CreditCardVisual({ card, usedAmount, onEdit, onViewInvoices }: Props) {
  const available = card.total_limit - usedAmount;
  const usagePercent = card.total_limit > 0 ? Math.min((usedAmount / card.total_limit) * 100, 100) : 0;

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const gradient = brandColors[card.brand] || brandColors.Outro;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
      {/* Card visual */}
      <div className={`bg-gradient-to-br ${gradient} p-5 text-white relative min-h-[160px] flex flex-col justify-between`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-lg">{card.nickname}</p>
            <p className="text-white/70 text-xs">{card.issuer_bank}</p>
          </div>
          <span className="text-sm font-semibold bg-white/20 px-2 py-0.5 rounded">{card.brand}</span>
        </div>
        <div className="flex justify-between items-end mt-4">
          <p className="text-lg tracking-widest font-mono">**** **** **** {card.last_four_digits}</p>
          <CreditCardIcon className="w-8 h-8 text-white/50" />
        </div>
      </div>

      {/* Info section */}
      <div className="bg-card p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Limite Total</span>
          <span className="font-semibold text-foreground">{fmt(card.total_limit)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Disponível</span>
          <span className={`font-semibold ${available < 0 ? 'text-destructive' : 'text-accent'}`}>{fmt(available)}</span>
        </div>
        <Progress value={usagePercent} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{usagePercent.toFixed(0)}% utilizado</p>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onViewInvoices}>
            <FileText className="w-4 h-4 mr-1" /> Ver Faturas
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-1" /> Editar
          </Button>
        </div>
      </div>
    </div>
  );
}
