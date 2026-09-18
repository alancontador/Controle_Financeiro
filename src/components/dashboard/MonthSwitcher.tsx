import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { addMonths, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface Props {
  month: Date;
  onChange: (month: Date) => void;
}

/**
 * Navegacao por mes do dashboard. As faturas importadas sao quase sempre do
 * mes anterior, entao "mes atual" fixo mostrava zero e parecia que nada
 * atualizava; aqui o mes em analise e explicito e da para voltar.
 */
export function MonthSwitcher({ month, onChange }: Props) {
  const today = new Date();
  const isCurrent = isSameMonth(month, today);
  const label = format(month, "MMMM 'de' yyyy", { locale: ptBR });
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 lg:mb-6">
      <div className="inline-flex items-center rounded-lg border border-border bg-card">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onChange(addMonths(month, -1))} aria-label="Mês anterior">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="px-2 text-sm font-medium capitalize min-w-[9.5rem] text-center flex items-center justify-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-primary" /> {label}
        </span>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onChange(addMonths(month, 1))} aria-label="Próximo mês" disabled={isCurrent || month > today}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      {!isCurrent && (
        <Button variant="outline" size="sm" className="h-9" onClick={() => onChange(today)}>Mês atual</Button>
      )}
      <span className="text-xs text-muted-foreground">Os cartões, o gráfico e as categorias mostram o mês selecionado.</span>
    </div>
  );
}
