import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';
import type { PersonSpend } from '@/hooks/useCardPeople';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Faixa "Quem esta gastando mais": consolidado das faturas mais recentes de todos os cartoes, por pessoa. */
export function WhoSpendsMore({ overall }: { overall: PersonSpend[] }) {
  if (overall.length === 0) return null;
  const grand = overall.reduce((s, p) => s + p.total, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Quem está gastando mais
        </CardTitle>
        <p className="text-xs text-muted-foreground">Faturas mais recentes de todos os cartões · total {fmt(grand)}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {overall.map((p, i) => (
          <div key={p.person} className={`rounded-lg p-3 border ${i === 0 ? 'border-primary/40 bg-primary/5' : 'border-border/60'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{i === 0 ? '🥇 ' : ''}{p.person}</span>
              <span className="text-sm font-semibold">{fmt(p.total)}</span>
            </div>
            <Progress value={p.share * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">{Math.round(p.share * 100)}% do total</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
