import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { SpendingPattern } from '@/hooks/useInsights';
import { cn } from '@/lib/utils';

interface SpendingPatternsProps {
  patterns: SpendingPattern[];
}

const typeConfig = {
  positive: {
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    icon: TrendingUp,
  },
  negative: {
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    icon: TrendingDown,
  },
  neutral: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    icon: Minus,
  },
};

export function SpendingPatterns({ patterns }: SpendingPatternsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Padrões Identificados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {patterns.map((pattern, index) => {
            const config = typeConfig[pattern.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border',
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className={cn('p-2 rounded-full', config.bgColor)}>
                  <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-foreground">{pattern.title}</h4>
                    {pattern.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {pattern.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
