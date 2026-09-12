import { Users, CreditCard as CreditCardIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CARD_KIND_LABEL } from '@/lib/cards/kinds';
import type { PersonSpend } from '@/hooks/useCardPeople';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => d.split('-').reverse().join('/');
const pct = (share: number) => `${Math.round(share * 100)}%`;

interface Props {
  people: PersonSpend[];
  invoiceLabel: string | null;
}

/**
 * Abaixo de cada cartao cadastrado: pessoa -> cartoes da fatura (principal,
 * virtual, adicional), com o gasto de cada um na fatura mais recente e a
 * fatia de cada pessoa.
 */
export function CardPeopleBreakdown({ people, invoiceLabel }: Props) {
  if (people.length === 0) {
    return <p className="text-sm text-muted-foreground mt-3">Importe uma fatura para ver os gastos por pessoa e por cartão.</p>;
  }
  const top = people[0];
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Por pessoa {invoiceLabel ? `· fatura fechada em ${fmtDate(invoiceLabel)}` : ''}</span>
        <span>Maior gasto: <span className="font-medium text-foreground">{top.person}</span> ({pct(top.share)})</span>
      </div>
      {people.map((p) => (
        <div key={p.person} className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">{p.person}</span>
            <span className="text-sm font-semibold">{fmt(p.total)} <span className="text-xs text-muted-foreground font-normal">({pct(p.share)})</span></span>
          </div>
          <Progress value={p.share * 100} className="h-1.5 mb-2" />
          <ul className="space-y-1">
            {p.cards.map((c) => (
              <li key={c.lastFour || 'sem-cartao'} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CreditCardIcon className="w-3.5 h-3.5" />
                  {c.lastFour ? `${c.kind ? CARD_KIND_LABEL[c.kind] : 'Cartão'} •••• ${c.lastFour}` : 'Sem cartão'}
                  {c.cardHolder && <span className="text-xs italic">(cartão de {c.cardHolder})</span>}
                  <span className="text-xs">· {c.itemCount} lançamento{c.itemCount === 1 ? '' : 's'}</span>
                </span>
                <span className={c.total < 0 ? 'text-emerald-600' : ''}>{fmt(c.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
