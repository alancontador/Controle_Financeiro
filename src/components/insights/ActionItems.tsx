import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { ActionItem, MonthlyTrend } from '@/hooks/useInsights';
import { cn } from '@/lib/utils';

interface ActionItemsProps {
  actionItems: ActionItem[];
  monthlyTrend: MonthlyTrend;
}

const priorityConfig = {
  high: {
    label: 'Alta',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    icon: AlertCircle,
  },
  medium: {
    label: 'Média',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: Clock,
  },
  low: {
    label: 'Baixa',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: CheckCircle2,
  },
};

const trendConfig = {
  improving: {
    label: 'Melhorando',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  stable: {
    label: 'Estável',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  declining: {
    label: 'Em queda',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
  },
};

export function ActionItems({ actionItems, monthlyTrend }: ActionItemsProps) {
  const trend = trendConfig[monthlyTrend.trend];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="space-y-6"
    >
      {/* Monthly Trend */}
      <Card className={cn('border', trend.borderColor, trend.bgColor)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={cn('px-3 py-1.5 rounded-full text-sm font-medium', trend.bgColor, trend.color)}>
              {trend.label}
            </div>
            <p className="text-foreground flex-1">{monthlyTrend.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRight className="w-5 h-5 text-primary" />
            Próximos Passos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionItems.map((item, index) => {
            const config = priorityConfig[item.priority];
            const Icon = config.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card"
              >
                <div className={cn('p-2 rounded-full shrink-0', config.bgColor)}>
                  <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-foreground">{item.action}</h4>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', config.bgColor, config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {item.timeframe}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
