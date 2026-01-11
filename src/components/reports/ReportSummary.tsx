import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { MonthlyComparison } from "@/hooks/useReports";

interface ReportSummaryProps {
  currentMonth: MonthlyComparison | null;
  previousMonth: MonthlyComparison | null;
}

export function ReportSummary({ currentMonth, previousMonth }: ReportSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getVariation = (current: number, previous: number) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const stats = [
    {
      label: "Receitas do Mês",
      value: currentMonth?.totalIncome || 0,
      previousValue: previousMonth?.totalIncome || 0,
      icon: TrendingUp,
      color: "accent",
      positiveIsGood: true,
    },
    {
      label: "Despesas do Mês",
      value: currentMonth?.totalExpense || 0,
      previousValue: previousMonth?.totalExpense || 0,
      icon: TrendingDown,
      color: "destructive",
      positiveIsGood: false,
    },
    {
      label: "Saldo do Mês",
      value: currentMonth?.balance || 0,
      previousValue: previousMonth?.balance || 0,
      icon: Wallet,
      color: (currentMonth?.balance || 0) >= 0 ? "accent" : "destructive",
      positiveIsGood: true,
    },
    {
      label: "Maior Categoria",
      value: currentMonth?.categoriesExpenses[0]?.amount || 0,
      categoryName: currentMonth?.categoriesExpenses[0]?.categoryName || "N/A",
      icon: PiggyBank,
      color: "primary",
      isCategory: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const variation = !stat.isCategory
          ? getVariation(stat.value, stat.previousValue || 0)
          : null;
        const isPositive = variation !== null && variation > 0;
        const variationIsGood = stat.positiveIsGood ? isPositive : !isPositive;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`p-2.5 rounded-xl bg-${stat.color}/10`}
                    style={{
                      backgroundColor:
                        stat.color === "accent"
                          ? "hsl(160 100% 39% / 0.1)"
                          : stat.color === "destructive"
                          ? "hsl(0 72% 65% / 0.1)"
                          : "hsl(255 75% 64% / 0.1)",
                    }}
                  >
                    <stat.icon
                      className="w-5 h-5"
                      style={{
                        color:
                          stat.color === "accent"
                            ? "hsl(160, 100%, 39%)"
                            : stat.color === "destructive"
                            ? "hsl(0, 72%, 65%)"
                            : "hsl(255, 75%, 64%)",
                      }}
                    />
                  </div>
                  {variation !== null && (
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        variationIsGood
                          ? "bg-accent/10 text-accent"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {variation.toFixed(1)}%
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                <p className="text-foreground text-2xl font-bold tracking-tight">
                  {stat.isCategory
                    ? stat.categoryName !== "N/A"
                      ? formatCurrency(stat.value)
                      : "—"
                    : formatCurrency(stat.value)}
                </p>
                {stat.isCategory && stat.categoryName !== "N/A" && (
                  <p className="text-muted-foreground text-xs mt-1">{stat.categoryName}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
