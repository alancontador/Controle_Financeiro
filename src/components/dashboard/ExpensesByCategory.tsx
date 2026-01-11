import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  ShoppingBag,
  Home,
  Car,
  Heart,
  GraduationCap,
  Gamepad2,
  Settings,
  Tag,
  UtensilsCrossed,
  PieChart as PieChartIcon,
} from "lucide-react";
import { CategoryBreakdown } from "@/hooks/useDashboardStats";

interface ExpensesByCategoryProps {
  data: CategoryBreakdown[];
}

const iconMap: Record<string, React.ElementType> = {
  UtensilsCrossed,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  Settings,
  Tag,
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 rounded-lg border border-border">
        <p className="text-foreground font-medium">{payload[0].name}</p>
        <p className="text-muted-foreground text-sm">
          R$ {Number(payload[0].value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-primary text-xs font-medium">
          {payload[0].payload.percentage?.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

export function ExpensesByCategory({ data }: ExpensesByCategoryProps) {
  const chartData = data.map((item) => ({
    name: item.name,
    value: item.amount,
    percentage: item.percentage,
    color: item.color,
    icon: item.icon,
  }));

  const totalExpenses = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <PieChartIcon className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h3 className="text-foreground font-semibold text-lg">Despesas por Categoria</h3>
          <p className="text-muted-foreground text-sm">Este mês</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8">
          <PieChartIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Sem despesas este mês</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
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
                  <p className="text-foreground font-bold text-sm">
                    {totalExpenses >= 1000
                      ? `R$ ${(totalExpenses / 1000).toFixed(0)}k`
                      : `R$ ${totalExpenses.toFixed(0)}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {data.slice(0, 4).map((item, index) => {
                const Icon = iconMap[item.icon] || Tag;
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + index * 0.05 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground text-sm truncate max-w-[100px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-foreground text-sm font-medium">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
