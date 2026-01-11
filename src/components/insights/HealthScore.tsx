import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { FinancialSummary } from '@/hooks/useInsights';
import { cn } from '@/lib/utils';

interface HealthScoreProps {
  summary: FinancialSummary;
}

const statusConfig = {
  excellent: {
    label: 'Excelente',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    icon: TrendingUp,
  },
  good: {
    label: 'Bom',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    icon: Heart,
  },
  attention: {
    label: 'Atenção',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Crítico',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    icon: XCircle,
  },
};

export function HealthScore({ summary }: HealthScoreProps) {
  const config = statusConfig[summary.health_status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn('border', config.borderColor, config.bgColor)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className={cn('w-5 h-5', config.color)} />
            Saúde Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted/20"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className={config.color}
                  strokeDasharray={352}
                  initial={{ strokeDashoffset: 352 }}
                  animate={{ strokeDashoffset: 352 - (352 * summary.health_score) / 100 }}
                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <motion.span
                  className={cn('text-3xl font-bold', config.color)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {summary.health_score}
                </motion.span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium', config.bgColor, config.color)}>
                <Icon className="w-4 h-4" />
                {config.label}
              </div>
              <p className="text-foreground">{summary.main_message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
