import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Zap, Clock, Target } from 'lucide-react';
import { SavingsTip } from '@/hooks/useInsights';
import { cn } from '@/lib/utils';

interface SavingsTipsProps {
  tips: SavingsTip[];
}

const difficultyConfig = {
  easy: {
    label: 'Fácil',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    icon: Zap,
  },
  medium: {
    label: 'Moderado',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: Clock,
  },
  hard: {
    label: 'Difícil',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: Target,
  },
};

export function SavingsTips({ tips }: SavingsTipsProps) {
  const totalPotential = tips.reduce((sum, tip) => sum + tip.potential_savings, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Sugestões de Economia
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Economia potencial</p>
              <p className="text-lg font-bold text-green-500">
                R$ {totalPotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tips.map((tip, index) => {
            const config = difficultyConfig[tip.difficulty];
            const DiffIcon = config.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h4 className="font-medium text-foreground">{tip.title}</h4>
                      <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', config.bgColor, config.color)}>
                        <DiffIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      {tip.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {tip.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Economia</p>
                    <p className="font-semibold text-green-500">
                      R$ {tip.potential_savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
