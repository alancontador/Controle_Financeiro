import { Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePeople } from '@/hooks/usePeople';
import { COMMON_PERSON } from '@/lib/people';

/** Valor "todos/casa toda" no select (null no dado). */
export const ALL_PEOPLE = '__all';
/** Valor "Casa/Comum" (lancamentos sem pessoa). */
export const COMMON_VALUE = '__common';

interface Props {
  /** null = todos / casa toda; COMMON_PERSON = sem pessoa; nome = pessoa. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** "filter": rotulo "Todas as pessoas"; "assign": rotulo "Casa toda (sem pessoa)". */
  mode?: 'filter' | 'assign';
  className?: string;
  /** Inclui terceiros na lista (padrao: so a casa). */
  includeThirdParties?: boolean;
}

/**
 * Seletor de pessoa usado em orcamentos, metas, investimentos, relatorios e
 * dashboard - a mesma lista da aba Pessoas (titulares/adicionais dos cartoes).
 */
export function PersonSelect({ value, onChange, mode = 'filter', className, includeThirdParties = false }: Props) {
  const { people } = usePeople();
  const names = people.filter((p) => includeThirdParties || p.kind === 'household').map((p) => p.name);
  const current = value === null ? ALL_PEOPLE : value === COMMON_PERSON ? COMMON_VALUE : value;
  // Pessoa que nao esta mais na lista (renomeada/removida) continua visivel para nao sumir do form.
  const options = value && value !== COMMON_PERSON && !names.includes(value) ? [value, ...names] : names;
  return (
    <Select value={current} onValueChange={(v) => onChange(v === ALL_PEOPLE ? null : v === COMMON_VALUE ? COMMON_PERSON : v)}>
      <SelectTrigger className={className} aria-label="Pessoa">
        <span className="flex items-center gap-2 min-w-0"><Users className="w-4 h-4 text-muted-foreground shrink-0" /><SelectValue /></span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_PEOPLE}>{mode === 'filter' ? 'Todas as pessoas' : 'Casa toda (sem pessoa)'}</SelectItem>
        {options.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
        <SelectItem value={COMMON_VALUE}>{COMMON_PERSON}</SelectItem>
      </SelectContent>
    </Select>
  );
}
