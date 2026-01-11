import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { Brain, RefreshCw, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useInsights } from '@/hooks/useInsights';
import { HealthScore } from '@/components/insights/HealthScore';
import { SpendingPatterns } from '@/components/insights/SpendingPatterns';
import { SavingsTips } from '@/components/insights/SavingsTips';
import { ActionItems } from '@/components/insights/ActionItems';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ onAnalyze, loading }: { onAnalyze: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Brain className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Análise Inteligente</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Nossa IA irá analisar seus gastos dos últimos 6 meses e fornecer insights personalizados 
        para ajudar você a economizar e melhorar sua saúde financeira.
      </p>
      <Button onClick={onAnalyze} disabled={loading} size="lg" className="gap-2">
        <Sparkles className="w-5 h-5" />
        {loading ? 'Analisando...' : 'Iniciar Análise'}
      </Button>
    </motion.div>
  );
}

export default function Insights() {
  const { user, loading: authLoading } = useAuth();
  const { loading, data, error, fetchInsights } = useInsights();

  useEffect(() => {
    if (user && !data && !loading && !error) {
      // Auto-fetch on first load
    }
  }, [user, data, loading, error]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Insights Financeiros</h1>
                <p className="text-muted-foreground text-sm">Análise inteligente dos seus gastos</p>
              </div>
            </div>

            {data && (
              <Button
                variant="outline"
                onClick={fetchInsights}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Análise
              </Button>
            )}
          </motion.div>

          {/* Content */}
          {loading && !data ? (
            <LoadingSkeleton />
          ) : !data ? (
            <EmptyState onAnalyze={fetchInsights} loading={loading} />
          ) : (
            <div className="space-y-6">
              {/* Health Score */}
              <HealthScore summary={data.insights.summary} />

              {/* Two column layout */}
              <div className="grid lg:grid-cols-2 gap-6">
                <SpendingPatterns patterns={data.insights.patterns} />
                <SavingsTips tips={data.insights.savings_tips} />
              </div>

              {/* Action Items */}
              <ActionItems 
                actionItems={data.insights.action_items} 
                monthlyTrend={data.insights.monthly_trend} 
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
