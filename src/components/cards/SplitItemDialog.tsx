import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Scissors, Equal, Trash2 } from 'lucide-react';
import { splitEqually, validateSplit, type Share } from '@/lib/cards/split';
import type { InvoiceItem } from '@/hooks/useCreditCards';

/** O que a divisao precisa saber da compra; um item da revisao (sem id) tambem serve. */
export type SplittableItem = Pick<InvoiceItem, 'description' | 'amount' | 'holder_name'>;

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const toNumber = (s: string) => {
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const toInput = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  item: SplittableItem | null;
  current: Share[];
  people: string[];
  thirdParties?: ReadonlySet<string>;
  onClose: () => void;
  onSave: (shares: Share[]) => Promise<boolean>;
}

/**
 * Divide o valor de uma compra entre pessoas. Marca quem participa, ajusta os
 * valores (ou "Igualmente"), e a soma tem que fechar ao centavo com a compra.
 */
export function SplitItemDialog({ item, current, people, thirdParties, onClose, onSave }: Props) {
  const amount = Number(item?.amount ?? 0);
  const candidates = useMemo(() => [...new Set([item?.holder_name ?? '', ...people].filter(Boolean))], [item, people]);
  const [selected, setSelected] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    if (current.length > 0) {
      setSelected(current.map((s) => s.person));
      setValues(Object.fromEntries(current.map((s) => [s.person, toInput(s.amount)])));
    } else {
      // Sugestao: todos da casa, em partes iguais.
      const all = candidates;
      setSelected(all);
      setValues(Object.fromEntries(splitEqually(amount, all).map((s) => [s.person, toInput(s.amount)])));
    }
  }, [item, current, candidates, amount]);

  const shares: Share[] = selected.map((person) => ({ person, amount: toNumber(values[person] ?? '0') }));
  const check = validateSplit(amount, shares);

  const toggle = (person: string, on: boolean) => {
    const next = on ? [...selected, person] : selected.filter((p) => p !== person);
    setSelected(next);
    setValues(Object.fromEntries(splitEqually(amount, next).map((s) => [s.person, toInput(s.amount)])));
  };
  const equalize = () => setValues(Object.fromEntries(splitEqually(amount, selected).map((s) => [s.person, toInput(s.amount)])));

  const save = async (next: Share[]) => {
    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scissors className="w-4 h-4" /> Dividir compra</DialogTitle>
          <DialogDescription>
            {item?.description} · {fmt(amount)} · cartão de {item?.holder_name}. A compra continua no cartão; só a despesa é repartida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {candidates.map((person) => {
            const on = selected.includes(person);
            return (
              <div key={person} className="flex items-center gap-3">
                <Checkbox checked={on} onCheckedChange={(v) => toggle(person, v === true)} id={`split-${person}`} />
                <label htmlFor={`split-${person}`} className="flex-1 text-sm truncate">
                  {person}{thirdParties?.has(person) ? <span className="text-xs text-muted-foreground"> (terceiro)</span> : ''}
                </label>
                <Input
                  className="w-32 h-8 text-right"
                  value={on ? values[person] ?? '' : ''}
                  disabled={!on}
                  onChange={(e) => setValues((prev) => ({ ...prev, [person]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="outline" size="sm" onClick={equalize} disabled={selected.length === 0}>
            <Equal className="w-3.5 h-3.5 mr-1" /> Igualmente
          </Button>
          <span className={check.ok ? 'text-emerald-600' : 'text-amber-600'}>
            {check.ok ? 'Fecha com a compra' : check.diff > 0 ? `Faltam ${fmt(check.diff)}` : `Sobram ${fmt(-check.diff)}`}
          </span>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {current.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={saving} onClick={() => save([])}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover divisão
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="button" onClick={() => save(shares)} disabled={!check.ok || saving}>{saving ? 'Salvando...' : 'Salvar divisão'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
