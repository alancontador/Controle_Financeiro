import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Coffee,
  Home,
  Car,
  Briefcase,
  Wallet,
  TrendingUp,
  Heart,
  GraduationCap,
  Gamepad2,
  Settings,
  Tag,
  Plus,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardTransaction } from "@/hooks/useDashboardStats";

interface RecentTransactionsProps {
  transactions: DashboardTransaction[];
  loading?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  Wallet,
  Briefcase,
  TrendingUp,
  Plus,
  UtensilsCrossed,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  Settings,
  Coffee,
  Tag,
};

export function RecentTransactionsReal({ transactions, loading }: RecentTransactionsProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-foreground font-semibold text-lg">Transações Recentes</h3>
            <p className="text-muted-foreground text-sm">Últimas movimentações</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div>
                  <div className="h-4 w-24 bg-muted rounded mb-1" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-muted rounded" />
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
      transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-foreground font-semibold text-lg">Transações Recentes</h3>
          <p className="text-muted-foreground text-sm">Últimas movimentações</p>
        </div>
        <Link to="/transactions" className="text-primary text-sm font-medium hover:underline">
          Ver todas
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma transação encontrada</p>
          <Link to="/transactions" className="text-primary text-sm hover:underline">
            Adicionar transação
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction, index) => {
            const Icon = iconMap[transaction.category_icon] || Tag;

            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      transaction.type === "income"
                        ? "bg-accent/10 text-accent"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">{transaction.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {transaction.category_name} • {transaction.dateLabel}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "font-medium text-sm",
                    transaction.type === "income" ? "text-accent" : "text-foreground"
                  )}
                >
                  {transaction.type === "income" ? "+" : "-"} R${" "}
                  {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
