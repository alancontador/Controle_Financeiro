import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useUpcomingInvoices } from '@/hooks/useUpcomingInvoices';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const fmtMonth = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1];

/**
 * Card do Dashboard: proxima fatura (comprometido / provavel) e quanto da renda
 * media ja esta comprometido com parcelas nos proximos 3 meses.
 */
export function UpcomingInvoicesCard() {
  const { projection, byPerson, committedNext3, avgIncome3, loading } = useUpcomingInvoices(undefined, 3);
  const next = projection[0];
  const nextByPerson = Object.entries(byPerson)
    .map(([person, series]) => ({ person, total: series[0] ? series[0].committed + series[0].estimated : 0 }))
    .filter((p) => p.total !== 0)
    .sort((a, b) => b.total - a.total);
  const income3 = avgIncome3 * 3;
  const ratio = income3 > 0 ? committedNext3 / income3 : null;
  const pct = ratio === null ? 0 : Math.min(100, Math.round(ratio * 100));
  const tone = ratio === null ? 'text-muted-foreground' : ratio > 0.5 ? 'text-destructive' : ratio > 0.3 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" /> Próximas faturas
          </h3>
          <p className="text-muted-foreground text-sm">Cartões de crédito</p>
        </div>
        <Link to="/cartoes" className="text-sm text-primary hover:underline flex items-center gap-1">
          Ver cartões <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-8 w-40 bg-muted rounded" />
          <div className="h-2 w-full bg-muted rounded" />
        </div>
      ) : !next ? (
        <p className="text-sm text-muted-foreground">Importe uma fatura na aba Cartões para ver a projeção.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fatura de {fmtMonth(next.month)}</p>
            <p className="text-2xl font-bold text-foreground">{fmt(next.committed + next.estimated)}</p>
            <p className="text-sm text-muted-foreground">
              {fmt(next.committed)} em parcelas já assumidas · {fmt(next.estimated)} estimado em gastos recorrentes
            </p>
            {nextByPerson.length > 0 && (
              <ul className="mt-2 space-y-1">
                {nextByPerson.map((p) => (
                  <li key={p.person} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{p.person}</span>
                    <span className="font-medium">{fmt(p.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Parcelas nos próximos 3 meses × renda</span>
              <span className={`font-semibold ${tone}`}>{ratio === null ? 'sem renda cadastrada' : `${pct}%`}</span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {fmt(committedNext3)} comprometidos{avgIncome3 > 0 ? ` · renda ${fmt(avgIncome3)}/mês` : ''}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
