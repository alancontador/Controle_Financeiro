import { motion } from 'framer-motion';
import { Users, AlertTriangle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { PersonInsight } from '@/hooks/useInsights';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS = {
  excellent: { label: 'Excelente', Icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' },
  good: { label: 'Bom', Icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' },
  attention: { label: 'Atenção', Icon: AlertTriangle, cls: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
  critical: { label: 'Crítico', Icon: XCircle, cls: 'text-destructive bg-destructive/10 border-destructive/30' },
} as const;

/** Diagnostico da IA por pessoa: onde esta o gargalo e o que cada uma precisa ajustar. */
export function PersonInsights({ people }: { people: PersonInsight[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
      <h3 className="text-foreground font-semibold text-lg flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-primary" /> Por pessoa
      </h3>
      <p className="text-muted-foreground text-sm mb-4">Onde está o gargalo e o que cada um precisa ajustar</p>
      <div className="grid md:grid-cols-2 gap-4">
        {people.map((p) => {
          const st = STATUS[p.status] ?? STATUS.attention;
          return (
            <div key={p.person} className={`rounded-lg border p-4 ${st.cls.split(' ').slice(1).join(' ')}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-foreground">{p.person}</span>
                <span className={`text-xs font-medium flex items-center gap-1 ${st.cls.split(' ')[0]}`}>
                  <st.Icon className="w-3.5 h-3.5" /> {st.label}
                </span>
              </div>
              <p className="text-sm text-foreground mb-3">{p.main_message}</p>
              <div className="text-sm space-y-1.5">
                <p className="flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" /><span><span className="font-medium">Gargalo:</span> {p.top_issue}</span></p>
                <p className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" /><span><span className="font-medium">Ajuste:</span> {p.suggestion}</span></p>
                {p.potential_savings > 0 && (
                  <p className="text-xs text-muted-foreground">Economia potencial: {fmt(p.potential_savings)}/mês</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
