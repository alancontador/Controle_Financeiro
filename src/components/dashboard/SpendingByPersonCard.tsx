import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSpendingByPerson } from '@/hooks/useSpendingByPerson';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const fmtMonth = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1];

/**
 * Card do Dashboard: despesas do mes por pessoa, com fatia, variacao contra o
 * mes anterior e as maiores categorias de cada uma - para achar o gargalo.
 */
export function SpendingByPersonCard({ month: wanted }: { month?: string } = {}) {
  const { month, isFallback, summary, loading } = useSpendingByPerson(2, wanted);
  const grand = summary.reduce((s, p) => s + p.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Gastos por pessoa
          </h3>
          <p className="text-muted-foreground text-sm">{fmtMonth(month)}{isFallback ? ' (último mês com dados)' : ''} · total {fmt(grand)}</p>
        </div>
        <Link to="/transactions" className="text-sm text-primary hover:underline flex items-center gap-1">
          Ver transações <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded" />)}
        </div>
      ) : summary.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem despesas neste mês ainda.</p>
      ) : (
        <div className="space-y-4">
          {summary.map((p, i) => {
            const prev = p.previousTotal ?? 0;
            const delta = prev > 0 ? (p.total - prev) / prev : null;
            const Icon = delta === null ? Minus : delta > 0.05 ? TrendingUp : delta < -0.05 ? TrendingDown : Minus;
            const tone = delta === null ? 'text-muted-foreground' : delta > 0.05 ? 'text-destructive' : delta < -0.05 ? 'text-emerald-600' : 'text-muted-foreground';
            return (
              <div key={p.person}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{i === 0 && summary.length > 1 ? '🥇 ' : ''}{p.person}</span>
                  <span className="text-sm font-semibold">
                    {fmt(p.total)} <span className="text-xs text-muted-foreground font-normal">({Math.round(p.share * 100)}%)</span>
                  </span>
                </div>
                <Progress value={p.share * 100} className="h-1.5" />
                <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <span className="truncate">
                    {p.topCategories.map((c) => `${c.category} ${fmt(c.total)}`).join(' · ')}
                  </span>
                  <span className={`flex items-center gap-1 shrink-0 ${tone}`}>
                    <Icon className="w-3 h-3" />
                    {delta === null ? 'sem mês anterior' : `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}% vs mês anterior`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
