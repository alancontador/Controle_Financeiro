import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Wallet, Target, BarChart3 } from "lucide-react";
import { InvestmentAsset } from "@/hooks/useInvestments";

interface PortfolioOverviewProps {
  assets: InvestmentAsset[];
  totalValue: number;
  averageMonthlyReturn: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 rounded-lg border border-border">
        <p className="text-foreground text-sm font-semibold">{payload[0].name}</p>
        <p className="text-muted-foreground text-xs">
          R$ {payload[0].payload.currentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-primary text-xs font-medium">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

export function PortfolioOverview({ assets, totalValue, averageMonthlyReturn }: PortfolioOverviewProps) {
  const chartData = assets.map(asset => ({
    name: asset.name,
    value: asset.allocation,
    currentValue: asset.currentValue,
    color: asset.color,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-foreground font-semibold text-lg">Portfólio</h3>
          <p className="text-muted-foreground text-sm">Distribuição dos ativos</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Pie Chart */}
        <div className="w-48 h-48 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="text-foreground font-bold text-lg">
                R$ {(totalValue / 1000).toFixed(0)}k
              </p>
            </div>
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 w-full space-y-3">
          {assets.map((asset, index) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                <div>
                  <p className="text-foreground text-sm font-medium">{asset.name}</p>
                  <p className="text-muted-foreground text-xs">
                    R$ {asset.currentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-foreground text-sm font-semibold">{asset.allocation}%</p>
                <p className="text-accent text-xs">+{asset.monthlyReturn}% / mês</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <p className="text-foreground font-bold text-lg">+{averageMonthlyReturn.toFixed(2)}%</p>
          <p className="text-muted-foreground text-xs">Rent. Média/Mês</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <p className="text-foreground font-bold text-lg">{assets.length}</p>
          <p className="text-muted-foreground text-xs">Classes de Ativo</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BarChart3 className="w-4 h-4 text-warning" />
          </div>
          <p className="text-foreground font-bold text-lg">
            +{((Math.pow(1 + averageMonthlyReturn / 100, 12) - 1) * 100).toFixed(1)}%
          </p>
          <p className="text-muted-foreground text-xs">Rent. Anual Est.</p>
        </div>
      </div>
    </motion.div>
  );
}
