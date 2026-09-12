import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSpendingByPerson } from '@/hooks/useSpendingByPerson';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fmtMonth = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

/** Relatorio: despesas por pessoa nos ultimos 6 meses, com media e tendencia. */
export function PeopleBreakdown() {
  const { history, months, loading } = useSpendingByPerson(6);
  const people = Object.keys(history).sort((a, b) => {
    const ta = history[a].reduce((s, m) => s + m.total, 0);
    const tb = history[b].reduce((s, m) => s + m.total, 0);
    return tb - ta;
  });

  if (loading || people.length === 0) return null;

  const totalsByMonth = months.map((_, k) => people.reduce((s, p) => s + history[p][k].total, 0));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
      <h3 className="text-foreground font-semibold text-lg flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-primary" /> Despesas por pessoa
      </h3>
      <p className="text-muted-foreground text-sm mb-4">Últimos 6 meses · quem gasta quanto, mês a mês</p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              {months.map((m) => <TableHead key={m} className="text-right">{fmtMonth(m)}</TableHead>)}
              <TableHead className="text-right">Média</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((p) => {
              const series = history[p];
              const total = series.reduce((s, m) => s + m.total, 0);
              const active = series.filter((m) => m.total !== 0).length || 1;
              return (
                <TableRow key={p}>
                  <TableCell className="font-medium whitespace-nowrap">{p}</TableCell>
                  {series.map((m, k) => {
                    const share = totalsByMonth[k] > 0 ? m.total / totalsByMonth[k] : 0;
                    return (
                      <TableCell key={m.month} className="text-right whitespace-nowrap" title={`${Math.round(share * 100)}% do mês`}>
                        {m.total ? fmt(m.total) : '–'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">{fmt(total / active)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap font-semibold">{fmt(total)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              {totalsByMonth.map((t, k) => <TableCell key={months[k]} className="text-right font-semibold whitespace-nowrap">{fmt(t)}</TableCell>)}
              <TableCell />
              <TableCell className="text-right font-semibold whitespace-nowrap">{fmt(totalsByMonth.reduce((s, t) => s + t, 0))}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
