import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { InvestmentCard } from "@/components/dashboard/InvestmentCard";
import { GoalsCard } from "@/components/dashboard/GoalsCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Wallet, TrendingUp, CreditCard, PiggyBank } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="ml-64 p-8">
        <Header />

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-6">
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <BalanceChart />
          <InvestmentCard />
        </div>

        {/* Secondary Content Grid */}
        <div className="grid grid-cols-2 gap-6">
          <RecentTransactions />
          <GoalsCard />
        </div>

        {/* Footer Microcopy */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            "Seu dinheiro está trabalhando — e bem."
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;