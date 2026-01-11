import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { InvestmentCard } from "@/components/dashboard/InvestmentCard";
import { GoalsCard } from "@/components/dashboard/GoalsCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Wallet, TrendingUp, CreditCard, PiggyBank } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <Header />

        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
          <StatCard
            title="Patrimônio Total"
            value="R$ 1.254.920"
            change="+3.8%"
            changeType="positive"
            icon={Wallet}
            delay={0}
          />
          <StatCard
            title="Receitas do Mês"
            value="R$ 12.800"
            change="+8.2%"
            changeType="positive"
            icon={TrendingUp}
            delay={0.05}
          />
          <StatCard
            title="Despesas do Mês"
            value="R$ 7.600"
            change="-5.4%"
            changeType="positive"
            icon={CreditCard}
            delay={0.1}
          />
          <StatCard
            title="Investido"
            value="R$ 732.400"
            change="+5.2%"
            changeType="positive"
            icon={PiggyBank}
            delay={0.15}
          />
        </div>

        {/* Main Content Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <BalanceChart />
          <InvestmentCard />
        </div>

        {/* Secondary Content Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <RecentTransactions />
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
