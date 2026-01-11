import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { MonthlyData } from "@/hooks/useDashboardStats";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BalanceChartProps {
  data: MonthlyData[];
  balanceEvolution: { date: string; balance: number; label: string }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="glass-card p-3 rounded-lg border border-border">
        <p className="text-foreground font-medium mb-2 capitalize">
          {data?.monthFull || label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: R$ {Number(entry.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const BalanceTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0]?.value || 0;
    return (
      <div className="glass-card p-3 rounded-lg border border-border">
        <p className="text-foreground font-medium mb-1">{label}</p>
        <p className={`text-sm font-semibold ${value >= 0 ? 'text-accent' : 'text-destructive'}`}>
          R$ {Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export function BalanceChart({ data, balanceEvolution }: BalanceChartProps) {
  const [view, setView] = useState<"comparison" | "evolution">("comparison");

  // Calculate totals
  const totalReceitas = data.reduce((sum, d) => sum + d.receitas, 0);
  const totalDespesas = data.reduce((sum, d) => sum + d.despesas, 0);
  const totalSaldo = totalReceitas - totalDespesas;

  const hasData = data.some((d) => d.receitas > 0 || d.despesas > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      className="glass-card rounded-xl p-6 col-span-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-foreground font-semibold text-lg">
              {view === "comparison" ? "Receitas vs Despesas" : "Evolução do Saldo"}
            </h3>
            <p className="text-muted-foreground text-sm">Últimos 7 meses</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList className="h-8">
              <TabsTrigger value="comparison" className="text-xs px-3 h-6">
                Comparativo
              </TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs px-3 h-6">
                Evolução
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground text-xs">Total Receitas</span>
          </div>
          <p className="text-accent font-bold">
            R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-destructive" />
            <span className="text-muted-foreground text-xs">Total Despesas</span>
          </div>
          <p className="text-destructive font-bold">
            R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className={`p-3 rounded-lg border ${totalSaldo >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${totalSaldo >= 0 ? 'text-primary' : 'text-destructive'}`} />
            <span className="text-muted-foreground text-xs">Saldo</span>
          </div>
          <p className={`font-bold ${totalSaldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
            R$ {totalSaldo.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma transação registrada</p>
            <p className="text-muted-foreground text-sm">Adicione transações para ver o gráfico</p>
          </div>
        </div>
      ) : view === "comparison" ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160 100% 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160 100% 39%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 72% 65%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0 72% 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(240 5% 65%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(240 5% 65%)", fontSize: 12 }}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="receitas"
                name="Receitas"
                stroke="hsl(160 100% 39%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReceitas)"
              />
              <Area
                type="monotone"
                dataKey="despesas"
                name="Despesas"
                stroke="hsl(0 72% 65%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDespesas)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={balanceEvolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(255 75% 64%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(255 75% 64%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(240 5% 65%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(240 5% 65%)", fontSize: 12 }}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
              />
              <Tooltip content={<BalanceTooltip />} />
              <Line
                type="monotone"
                dataKey="balance"
                name="Saldo"
                stroke="hsl(255 75% 64%)"
                strokeWidth={2}
                dot={{ fill: "hsl(255 75% 64%)", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "hsl(255 75% 64%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {hasData && view === "comparison" && (
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-muted-foreground">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Despesas</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
