import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Wallet, Target, PiggyBank } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useInvestments } from "@/hooks/useInvestments";
import { PortfolioOverview } from "@/components/investments/PortfolioOverview";
import { RetirementSimulator } from "@/components/investments/RetirementSimulator";
import { ProjectionChart } from "@/components/investments/ProjectionChart";
import { AssetComparison } from "@/components/investments/AssetComparison";
import { InvestmentsList } from "@/components/investments/InvestmentsList";

const Investments = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    investmentClasses,
    allocationByClass,
    investments,
    totalValue,
    averageMonthlyReturn,
    simulation,
    updateSimulation,
    projections,
    retirementIncome,
    assetComparisons,
    createClass,
    updateClass,
    deleteClass,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    updateQuotes,
    isUpdatingQuotes,
    lastQuotesUpdate,
    isLoading,
  } = useInvestments();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const finalValue = projections[projections.length - 1]?.value || 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            Investimentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seu portfólio e planeje sua aposentadoria
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Patrimônio</p>
                <p className="text-lg font-bold text-foreground">
                  R$ {totalValue > 0 ? (totalValue / 1000).toFixed(0) + 'k' : '0'}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rent. Mensal</p>
                <p className="text-lg font-bold text-accent">
                  {averageMonthlyReturn >= 0 ? '+' : ''}{averageMonthlyReturn.toFixed(2)}%
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meta Aposent.</p>
                <p className="text-lg font-bold text-foreground">
                  R$ {finalValue > 0 ? (finalValue / 1000000).toFixed(1) + 'M' : '0'}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Renda Passiva</p>
                <p className="text-lg font-bold text-primary">
                  R$ {retirementIncome.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Investments List - Full Width */}
        <div className="mb-6">
          <InvestmentsList
            investments={investments}
            investmentClasses={investmentClasses}
            onCreateInvestment={createInvestment}
            onUpdateInvestment={updateInvestment}
            onDeleteInvestment={deleteInvestment}
            onUpdateQuotes={updateQuotes}
            isUpdatingQuotes={isUpdatingQuotes}
            lastQuotesUpdate={lastQuotesUpdate}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PortfolioOverview
            investmentClasses={investmentClasses}
            allocationByClass={allocationByClass}
            totalValue={totalValue}
            averageMonthlyReturn={averageMonthlyReturn}
            onCreateClass={createClass}
            onUpdateClass={updateClass}
            onDeleteClass={deleteClass}
          />
          <RetirementSimulator
            simulation={simulation}
            updateSimulation={updateSimulation}
            retirementIncome={retirementIncome}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectionChart
            projections={projections}
            retirementAge={simulation.retirementAge}
          />
          <AssetComparison comparisons={assetComparisons} />
        </div>
      </main>
    </div>
  );
};

export default Investments;