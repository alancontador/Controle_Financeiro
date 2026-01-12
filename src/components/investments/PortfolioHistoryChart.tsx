import { useMemo } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Calendar, Info } from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PortfolioHistoryPoint {
  id: string;
  snapshot_date: string;
  total_value: number;
}

interface PortfolioHistoryChartProps {
  history: PortfolioHistoryPoint[];
  currentValue: number;
  isLoading?: boolean;
}

export function PortfolioHistoryChart({ history, currentValue, isLoading }: PortfolioHistoryChartProps) {
  const chartData = useMemo(() => {
    if (history.length === 0) return [];

    return history
      .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime())
      .map((point) => ({
        date: point.snapshot_date,
        value: Number(point.total_value),
        formattedDate: format(parseISO(point.snapshot_date), "dd/MM/yy", { locale: ptBR }),
        fullDate: format(parseISO(point.snapshot_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      }));
  }, [history]);

  const stats = useMemo(() => {
    if (chartData.length < 2) {
      return {
        variation: 0,
        variationPercent: 0,
        minValue: currentValue,
        maxValue: currentValue,
        avgValue: currentValue,
      };
    }

    const values = chartData.map(d => d.value);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const variation = lastValue - firstValue;
    const variationPercent = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    return {
      variation,
      variationPercent,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      avgValue: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [chartData, currentValue]);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{data.fullDate}</p>
          <p className="text-sm font-bold text-foreground">
            R$ {payload[0].value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Evolução Patrimonial</h2>
            <p className="text-xs text-muted-foreground">Carregando histórico...</p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </motion.div>
    );
  }

  if (chartData.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Evolução Patrimonial</h2>
            <p className="text-xs text-muted-foreground">Histórico do valor do portfólio</p>
          </div>
        </div>
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <Info className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">
            O histórico será registrado automaticamente a cada dia.
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            Você precisa de pelo menos 2 dias de registro para ver o gráfico.
          </p>
          {currentValue > 0 && (
            <p className="text-primary text-sm mt-3">
              Valor atual: R$ {currentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  const isPositive = stats.variationPercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Evolução Patrimonial</h2>
            <p className="text-xs text-muted-foreground">
              {chartData.length} dias de histórico
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-accent" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-accent' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{stats.variationPercent.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isPositive ? '+' : ''}R$ {stats.variation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Mínimo</p>
          <p className="text-sm font-semibold text-foreground">{formatValue(stats.minValue)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Média</p>
          <p className="text-sm font-semibold text-foreground">{formatValue(stats.avgValue)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Máximo</p>
          <p className="text-sm font-semibold text-foreground">{formatValue(stats.maxValue)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="formattedDate"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: "hsl(var(--primary))",
                strokeWidth: 2,
                fill: "hsl(var(--background))",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
