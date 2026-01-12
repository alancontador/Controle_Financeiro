import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subDays, subMonths, subYears, format, parseISO } from "date-fns";

type PeriodFilter = "30d" | "90d" | "1y" | "all";

interface PortfolioHistoryPoint {
  id: string;
  snapshot_date: string;
  total_value: number;
}

interface PerformanceVsBenchmarksProps {
  portfolioHistory: PortfolioHistoryPoint[];
  isLoading?: boolean;
}

// Annualized benchmark returns (approximate historical averages)
const benchmarkAnnualReturns: Record<string, number> = {
  CDI: 12.5,
  Ibovespa: 8.0,
  "S&P 500": 10.5,
};

const periodFilters: { label: string; value: PeriodFilter }[] = [
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1A", value: "1y" },
  { label: "Tudo", value: "all" },
];

function getDaysForPeriod(period: PeriodFilter): number {
  switch (period) {
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    default: return 365;
  }
}

export function PerformanceVsBenchmarks({ portfolioHistory, isLoading }: PerformanceVsBenchmarksProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all");

  const performanceData = useMemo(() => {
    if (portfolioHistory.length < 2) return null;

    const now = new Date();
    let cutoffDate: Date;

    switch (selectedPeriod) {
      case "30d":
        cutoffDate = subDays(now, 30);
        break;
      case "90d":
        cutoffDate = subDays(now, 90);
        break;
      case "1y":
        cutoffDate = subYears(now, 1);
        break;
      default:
        cutoffDate = new Date(0);
    }

    const filteredHistory = portfolioHistory
      .filter((point) => new Date(point.snapshot_date) >= cutoffDate)
      .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());

    if (filteredHistory.length < 2) return null;

    const firstValue = filteredHistory[0].total_value;
    const lastValue = filteredHistory[filteredHistory.length - 1].total_value;
    const portfolioReturn = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    // Calculate benchmark returns for the period
    const days = selectedPeriod === "all" 
      ? Math.max(1, Math.round((new Date(filteredHistory[filteredHistory.length - 1].snapshot_date).getTime() - new Date(filteredHistory[0].snapshot_date).getTime()) / (1000 * 60 * 60 * 24)))
      : getDaysForPeriod(selectedPeriod);

    const periodFraction = days / 365;

    const benchmarkReturns = Object.entries(benchmarkAnnualReturns).map(([name, annualReturn]) => ({
      name,
      return: annualReturn * periodFraction,
    }));

    return {
      portfolio: portfolioReturn,
      benchmarks: benchmarkReturns,
      days,
      startDate: filteredHistory[0].snapshot_date,
      endDate: filteredHistory[filteredHistory.length - 1].snapshot_date,
    };
  }, [portfolioHistory, selectedPeriod]);

  const chartData = useMemo(() => {
    if (!performanceData) return [];

    return [
      { name: "Meu Portfólio", return: performanceData.portfolio, fill: "hsl(var(--primary))" },
      ...performanceData.benchmarks.map((b) => ({
        name: b.name,
        return: b.return,
        fill: b.name === "CDI" ? "hsl(160 100% 39%)" : b.name === "Ibovespa" ? "hsl(255 75% 64%)" : "hsl(200 100% 50%)",
      })),
    ];
  }, [performanceData]);

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
            <h2 className="text-lg font-semibold text-foreground">Performance vs Benchmarks</h2>
            <p className="text-xs text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </motion.div>
    );
  }

  if (!performanceData) {
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
            <h2 className="text-lg font-semibold text-foreground">Performance vs Benchmarks</h2>
            <p className="text-xs text-muted-foreground">Compare seu portfólio com índices</p>
          </div>
        </div>
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <Info className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">
            Dados insuficientes para comparação.
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            É necessário pelo menos 2 dias de histórico.
          </p>
        </div>
      </motion.div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-bold text-foreground">{data.name}</p>
          <p className={`text-sm font-semibold ${data.return >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {data.return >= 0 ? '+' : ''}{data.return.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const isOutperforming = performanceData.portfolio > Math.max(...performanceData.benchmarks.map(b => b.return));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Performance vs Benchmarks</h2>
            <p className="text-xs text-muted-foreground">
              {performanceData.days} dias ({format(parseISO(performanceData.startDate), "dd/MM/yy")} - {format(parseISO(performanceData.endDate), "dd/MM/yy")})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          {periodFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={selectedPeriod === filter.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPeriod(filter.value)}
              className="h-7 px-3 text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Performance Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
        isOutperforming ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
      }`}>
        {isOutperforming ? '🎉 Superando os benchmarks!' : '📊 Acompanhando o mercado'}
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              width={100}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
            <Bar dataKey="return" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border justify-center">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-xs text-muted-foreground">{item.name}</span>
            <span className={`text-xs font-semibold ${item.return >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {item.return >= 0 ? '+' : ''}{item.return.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
