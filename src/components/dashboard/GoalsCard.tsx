import { motion } from "framer-motion";
import { Target, TrendingUp, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Goal {
  title: string;
  progress: number;
  status: "active" | "suggestion";
  icon: React.ElementType;
}

const goals: Goal[] = [
  { 
    title: "Reduzir gastos em lazer (-5%)", 
    progress: 68, 
    status: "active",
    icon: Target 
  },
  { 
    title: "Aumentar aporte mensal (+R$500)", 
    progress: 70, 
    status: "active",
    icon: TrendingUp 
  },
];

export function GoalsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
      className="glass-card rounded-xl p-6"
    >
      <div className="mb-4">
        <h3 className="text-foreground font-semibold text-lg">Metas e Recomendações</h3>
        <p className="text-muted-foreground text-sm">Suas metas ativas</p>
      </div>

      <div className="space-y-4">
        {goals.map((goal, index) => (
          <motion.div
            key={goal.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="p-3 rounded-lg bg-secondary/50 border border-border/50"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <goal.icon className="w-4 h-4 text-primary" />
                <span className="text-foreground text-sm font-medium">{goal.title}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                goal.status === "active" 
                  ? "bg-primary/10 text-primary" 
                  : "bg-accent/10 text-accent"
              }`}>
                {goal.status === "active" ? "Meta ativa" : "Sugestão"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={goal.progress} className="h-2 flex-1" />
              <span className="text-muted-foreground text-xs">{goal.progress}%</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Smart tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20"
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-accent mt-0.5" />
          <p className="text-accent text-sm">
            <span className="font-medium">Dica inteligente:</span> você pode antecipar sua aposentadoria em 2 anos com o novo aporte.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}