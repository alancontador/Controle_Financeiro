import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Target, 
  Lightbulb, 
  PiggyBank, 
  Plane, 
  Car, 
  Home, 
  GraduationCap, 
  Shield, 
  Wallet,
  Plus
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useGoals } from "@/hooks/useGoals";

const iconMap: Record<string, React.ElementType> = {
  Target,
  PiggyBank,
  Plane,
  Car,
  Home,
  GraduationCap,
  Shield,
  Wallet,
};

export function GoalsCard() {
  const { goals, loading, stats } = useGoals();
  const activeGoals = goals.filter(g => !g.is_completed).slice(0, 3);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
        className="glass-card rounded-xl p-6"
      >
        <div className="mb-4">
          <h3 className="text-foreground font-semibold text-lg">Metas Financeiras</h3>
          <p className="text-muted-foreground text-sm">Suas metas ativas</p>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-secondary/30 animate-pulse">
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-2 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-foreground font-semibold text-lg">Metas Financeiras</h3>
          <p className="text-muted-foreground text-sm">
            {stats.activeGoals} ativas • {stats.completedGoals} concluídas
          </p>
        </div>
        <Link to="/goals" className="text-primary text-sm font-medium hover:underline">
          Ver todas
        </Link>
      </div>

      {activeGoals.length === 0 ? (
        <div className="text-center py-6">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-2">Nenhuma meta ativa</p>
          <Link 
            to="/goals" 
            className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
          >
            <Plus className="w-4 h-4" />
            Criar meta
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeGoals.map((goal, index) => {
            const Icon = iconMap[goal.icon || 'Target'] || Target;
            const progress = Math.min(
              (Number(goal.current_amount) / Number(goal.target_amount)) * 100,
              100
            );

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="p-3 rounded-lg bg-secondary/50 border border-border/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: goal.color }} />
                    </div>
                    <span className="text-foreground text-sm font-medium truncate max-w-[150px]">
                      {goal.name}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    R$ {Number(goal.current_amount).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / 
                    R$ {Number(goal.target_amount).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span 
                    className="text-xs font-medium"
                    style={{ color: goal.color }}
                  >
                    {progress.toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Smart tip */}
      {stats.totalGoals > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <p className="text-accent text-sm">
              <span className="font-medium">Dica:</span> Você já alcançou{" "}
              {((stats.totalCurrentAmount / stats.totalTargetAmount) * 100).toFixed(0)}% do valor 
              total das suas metas. Continue assim!
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
