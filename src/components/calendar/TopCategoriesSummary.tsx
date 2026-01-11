import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, BarChart3 } from "lucide-react";
import { Transaction, Category } from "@/hooks/useTransactions";
import { Progress } from "@/components/ui/progress";
import { startOfMonth, endOfMonth } from "date-fns";

interface TopCategoriesSummaryProps {
  transactions: Transaction[];
  categories: Category[];
  currentMonth: Date;
}

interface CategorySummary {
  category: Category;
  total: number;
  percentage: number;
  transactionCount: number;
}

export function TopCategoriesSummary({
  transactions,
  categories,
  currentMonth,
}: TopCategoriesSummaryProps) {
  const topCategories = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Filter expense transactions for current month
    const monthExpenses = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        t.type === "expense" &&
        transactionDate >= monthStart &&
        transactionDate <= monthEnd
      );
    });

    // Group by category
    const categoryTotals = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;

    monthExpenses.forEach((t) => {
      if (t.category_id) {
        const existing = categoryTotals.get(t.category_id) || { total: 0, count: 0 };
        categoryTotals.set(t.category_id, {
          total: existing.total + Number(t.amount),
          count: existing.count + 1,
        });
        grandTotal += Number(t.amount);
      }
    });

    // Create summary array
    const summaries: CategorySummary[] = [];
    categoryTotals.forEach((data, categoryId) => {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        summaries.push({
          category,
          total: data.total,
          percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
          transactionCount: data.count,
        });
      }
    });

    // Sort by total and get top 5
    return summaries.sort((a, b) => b.total - a.total).slice(0, 5);
  }, [transactions, categories, currentMonth]);

  const totalExpenses = useMemo(() => {
    return topCategories.reduce((sum, cat) => sum + cat.total, 0);
  }, [topCategories]);

  if (topCategories.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Top Categorias</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma despesa registrada neste mês
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Top Categorias</h3>
            <p className="text-xs text-muted-foreground">Maiores gastos do mês</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {topCategories.map((item, index) => (
          <motion.div
            key={item.category.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.category.color || "#FF4F4F" }}
                />
                <span className="text-sm text-foreground truncate max-w-[120px]">
                  {item.category.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({item.transactionCount})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {item.percentage.toFixed(0)}%
                </span>
                <span className="text-sm font-semibold text-destructive">
                  R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            <Progress
              value={item.percentage}
              className="h-1.5"
              style={{
                // @ts-ignore - custom property for progress bar color
                "--progress-background": item.category.color || "#FF4F4F",
              } as React.CSSProperties}
            />
          </motion.div>
        ))}
      </div>

      {/* Total footer */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Total em {topCategories.length} categorias
          </span>
          <span className="text-sm font-bold text-destructive">
            R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
