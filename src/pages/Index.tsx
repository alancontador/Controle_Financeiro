import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Wallet, TrendingUp, CreditCard, PiggyBank } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { BalanceChart } from "@/components/dashboard/BalanceChartReal";
import { GoalsCard } from "@/components/dashboard/GoalsCard";
import { RecentTransactionsReal } from "@/components/dashboard/RecentTransactionsReal";
import { ExpensesByCategory } from "@/components/dashboard/ExpensesByCategory";
import { DashboardBudgetAlerts } from "@/components/dashboard/DashboardBudgetAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    loading,
    stats,
    monthlyChartData,
    balanceEvolution,
    expensesByCategory,
    recentTransactions,
  } = useDashboardStats();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  };

  const formatChange = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <Header />

        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
          <StatCard
            title="Saldo Total"
            value={formatCurrency(stats.totalBalance)}
            change={stats.totalBalance !== 0 ? formatChange(stats.balanceChange) : undefined}
            changeType={stats.balanceChange >= 0 ? "positive" : "negative"}
            icon={Wallet}
            delay={0}
          />
          <StatCard
            title="Receitas do Mês"
            value={formatCurrency(stats.monthlyIncome)}
            change={stats.lastMonthIncome > 0 ? formatChange(stats.incomeChange) : undefined}
            changeType={stats.incomeChange >= 0 ? "positive" : "negative"}
            icon={TrendingUp}
            delay={0.05}
          />
          <StatCard
            title="Despesas do Mês"
            value={formatCurrency(stats.monthlyExpenses)}
            change={stats.lastMonthExpenses > 0 ? formatChange(stats.expenseChange) : undefined}
            changeType={stats.expenseChange <= 0 ? "positive" : "negative"}
            icon={CreditCard}
            delay={0.1}
          />
          <StatCard
            title="Saldo do Mês"
            value={formatCurrency(stats.monthlyBalance)}
            changeType={stats.monthlyBalance >= 0 ? "positive" : "negative"}
            icon={PiggyBank}
            delay={0.15}
          />
        </div>

        {/* Budget Alerts */}
        <div className="mb-6">
          <DashboardBudgetAlerts />
        </div>

        {/* Main Content Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <BalanceChart data={monthlyChartData} balanceEvolution={balanceEvolution} />
          <ExpensesByCategory data={expensesByCategory} />
        </div>

        {/* Secondary Content Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <RecentTransactionsReal transactions={recentTransactions} loading={loading} />
          <GoalsCard />
        </div>

        {/* Footer Microcopy */}
        <div className="mt-8 text-center pb-4">
          <p className="text-muted-foreground text-sm">
            "Seu dinheiro está trabalhando — e bem."
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
