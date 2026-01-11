import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { ProjectionPoint } from "@/hooks/useInvestments";

interface ProjectionChartProps {
  projections: ProjectionPoint[];
  retirementAge: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-4 rounded-lg border border-border">
        <p className="text-foreground font-semibold mb-2">Idade: {label} anos</p>
        <div className="space-y-1">
          <p className="text-primary text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Patrimônio: R$ {Number(payload[0]?.value || 0).toLocaleString("pt-BR")}
          </p>
          <p className="text-accent text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Aportes: R$ {Number(payload[1]?.value || 0).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function ProjectionChart({ projections, retirementAge }: ProjectionChartProps) {
  const finalValue = projections[projections.length - 1]?.value || 0;
  const totalContributions = projections[projections.length - 1]?.contributions || 0;
  const gains = finalValue - totalContributions;
  const gainsPercentage = totalContributions > 0 ? ((gains / totalContributions) * 100).toFixed(1) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-foreground font-semibold text-lg">Projeção Patrimonial</h3>
            <p className="text-muted-foreground text-sm">Evolução até os {retirementAge} anos</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Patrimônio Final</p>
            <p className="text-primary font-bold text-lg">
              R$ {(finalValue / 1000000).toFixed(2)}M
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Ganhos</p>
            <p className="text-accent font-bold text-lg">+{gainsPercentage}%</p>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(255 75% 64%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(255 75% 64%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160 100% 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160 100% 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
            <XAxis
              dataKey="age"
              stroke="hsl(240 5% 65%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(240 5% 65%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-muted-foreground text-sm">{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Patrimônio Total"
              stroke="hsl(255 75% 64%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
            <Area
              type="monotone"
              dataKey="contributions"
              name="Total Aportado"
              stroke="hsl(160 100% 39%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorContributions)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
