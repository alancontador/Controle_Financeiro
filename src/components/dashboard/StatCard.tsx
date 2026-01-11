import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  delay = 0 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-card rounded-xl p-4 lg:p-6 hover:border-primary/30 hover:glow-primary transition-all duration-250"
    >
      <div className="flex items-start justify-between mb-3 lg:mb-4">
        <div className="p-2 lg:p-3 rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            changeType === "positive" && "text-accent bg-accent/10",
            changeType === "negative" && "text-destructive bg-destructive/10",
            changeType === "neutral" && "text-muted-foreground bg-muted"
          )}>
            {changeType === "positive" && <TrendingUp className="w-3 h-3" />}
            {changeType === "negative" && <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      
      <p className="text-muted-foreground text-xs lg:text-sm mb-1">{title}</p>
      <p className="text-foreground text-lg lg:text-2xl font-bold tracking-tight">{value}</p>
    </motion.div>
  );
}
