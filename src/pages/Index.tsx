import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Wallet, TrendingUp, CreditCard, PiggyBank } from "lucide-react";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import { PersonSelect } from "@/components/people/PersonSelect";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { BalanceChart } from "@/components/dashboard/BalanceChartReal";
import { GoalsCard } from "@/components/dashboard/GoalsCard";
import { UpcomingInvoicesCard } from "@/components/dashboard/UpcomingInvoicesCard";
import { SpendingByPersonCard } from "@/components/dashboard/SpendingByPersonCard";
import { RecentTransactionsReal } from "@/components/dashboard/RecentTransactionsReal";
import { ExpensesByCategory } from "@/components/dashboard/ExpensesByCategory";
import { DashboardBudgetAlerts } from "@/components/dashboard/DashboardBudgetAlerts";
import { WeeklySummary } from "@/components/dashboard/WeeklySummary";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useRecurringForecast } from "@/hooks/useRecurringForecast";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  // Mes em analise: os cartoes de cima, o grafico e as categorias seguem ele.
  const [month, setMonth] = useState(() => new Date());
  // Pessoa em analise: null = casa toda. Vale para cartoes, graficos, orcamentos e metas.
  const [person, setPerson] = useState<string | null>(null);
  const {
    loading,
    stats,
    monthlyChartData,
    balanceEvolution,
    expensesByCategory,
    recentTransactions,
  } = useDashboardStats(month, person);
  const forecast = useRecurringForecast(format(month, "yyyy-MM"));

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

  // Valor completo: "R$ 2.882,40" em vez de "R$ 2.9k" - quem controla dinheiro quer os centavos.
  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const monthLabel = format(month, "MMM", { locale: ptBR });
  const hasMonthData = stats.monthlyIncome > 0 || stats.monthlyExpenses > 0;

  const formatChange = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-[var(--sidebar-w,16rem)] transition-[margin] duration-200 p-4 lg:p-8 pt-20 lg:pt-8">
        <Header />

        <div className="flex flex-wrap items-start gap-3">
          <MonthSwitcher month={month} onChange={setMonth} />
          <PersonSelect value={person} onChange={setPerson} className="h-9 w-[220px] mb-4 lg:mb-6" />
        </div>

        {!loading && !hasMonthData && (
          <div className="mb-6 rounded-lg border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <span>Nenhum lançamento em <span className="capitalize font-medium text-foreground">{format(month, "MMMM", { locale: ptBR })}</span> ainda. As faturas importadas costumam ser do mês anterior.</span>
            <button type="button" className="text-primary hover:underline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Ver mês anterior →</button>
          </div>
        )}

        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
          <StatCard
            title="Saldo acumulado"
            value={formatCurrency(stats.totalBalance)}
            hint="receitas − despesas de todo o período"
            title_hint="Tudo que entrou menos tudo que saiu, desde o início dos registros."
            icon={Wallet}
            delay={0}
          />
          <StatCard
            title={`Receitas de ${monthLabel}`}
            value={formatCurrency(stats.monthlyIncome)}
            hint={forecast.income > 0 ? `+ ${formatCurrency(forecast.income)} previstos (recorrentes)` : undefined}
            title_hint={forecast.income > 0 ? forecast.items.filter((i) => i.type === 'income').map((i) => `${i.description} em ${i.date.split('-').reverse().join('/')}`).join(' · ') : undefined}
            change={stats.lastMonthIncome > 0 && hasMonthData ? formatChange(stats.incomeChange) : undefined}
            changeType={stats.incomeChange >= 0 ? "positive" : "negative"}
            icon={TrendingUp}
            delay={0.05}
          />
          <StatCard
            title={`Despesas de ${monthLabel}`}
            value={formatCurrency(stats.monthlyExpenses)}
            hint={forecast.expense > 0 ? `+ ${formatCurrency(forecast.expense)} previstos (contas fixas)` : undefined}
            title_hint={forecast.expense > 0 ? forecast.items.filter((i) => i.type === 'expense').map((i) => `${i.description} em ${i.date.split('-').reverse().join('/')}`).join(' · ') : undefined}
            change={stats.lastMonthExpenses > 0 && hasMonthData ? formatChange(stats.expenseChange) : undefined}
            changeType={stats.expenseChange <= 0 ? "positive" : "negative"}
            icon={CreditCard}
            delay={0.1}
          />
          <StatCard
            title={`Saldo de ${monthLabel}`}
            value={formatCurrency(stats.monthlyBalance)}
            hint={forecast.income > 0 || forecast.expense > 0 ? `projetado: ${formatCurrency(stats.monthlyBalance + forecast.income - forecast.expense)}` : undefined}
            title_hint="Realizado até agora; o projetado soma as recorrências que ainda vão cair no mês."
            changeType={stats.monthlyBalance >= 0 ? "positive" : "negative"}
            icon={PiggyBank}
            delay={0.15}
          />
        </div>


        {/* Budget Alerts & Weekly Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
          <SpendingByPersonCard month={format(month, 'yyyy-MM')} />
          <DashboardBudgetAlerts month={month} person={person} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
          <WeeklySummary />
          <UpcomingInvoicesCard />
        </div>

        {/* Main Content Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <BalanceChart data={monthlyChartData} balanceEvolution={balanceEvolution} />
          <ExpensesByCategory data={expensesByCategory} subtitle={format(month, "MMMM 'de' yyyy", { locale: ptBR })} />
        </div>

        {/* Secondary Content Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <RecentTransactionsReal transactions={recentTransactions} loading={loading} />
          <GoalsCard person={person} />
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
