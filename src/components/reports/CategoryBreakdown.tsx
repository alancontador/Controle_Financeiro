import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryExpense } from "@/hooks/useReports";
import * as LucideIcons from "lucide-react";

interface CategoryBreakdownProps {
  categories: CategoryExpense[];
  totalExpense: number;
}

const COLORS = [
  "hsl(255, 75%, 64%)",
  "hsl(160, 100%, 39%)",
  "hsl(35, 100%, 50%)",
  "hsl(200, 100%, 50%)",
  "hsl(280, 100%, 60%)",
  "hsl(0, 72%, 65%)",
  "hsl(180, 70%, 45%)",
  "hsl(320, 80%, 55%)",
];

export function CategoryBreakdown({ categories, totalExpense }: CategoryBreakdownProps) {
  const chartData = categories.map((cat, index) => ({
    name: cat.categoryName,
    value: cat.amount,
    color: COLORS[index % COLORS.length],
    percentage: cat.percentage,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getIcon = (iconName: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const Icon = icons[iconName] || LucideIcons.HelpCircle;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-foreground text-lg">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum gasto registrado neste período
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(240, 6%, 7%)",
                      border: "1px solid hsl(240, 4%, 16%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "hsl(0, 0%, 91%)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category List */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {categories.map((category, index) => (
                <motion.div
                  key={category.categoryId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: COLORS[index % COLORS.length] + "20" }}
                    >
                      <span style={{ color: COLORS[index % COLORS.length] }}>
                        {getIcon(category.categoryIcon)}
                      </span>
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium">{category.categoryName}</p>
                      <p className="text-muted-foreground text-xs">
                        {category.transactionCount} transações
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-semibold">{formatCurrency(category.amount)}</p>
                    <p className="text-muted-foreground text-xs">{category.percentage.toFixed(1)}%</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
