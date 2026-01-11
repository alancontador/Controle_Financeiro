import { motion } from "framer-motion";
import { ShoppingBag, Coffee, Home, Car, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  icon: React.ElementType;
}

const transactions: Transaction[] = [
  { 
    id: "1", 
    description: "Salário", 
    category: "Renda", 
    amount: 12500, 
    type: "income", 
    date: "Hoje",
    icon: Briefcase 
  },
  { 
    id: "2", 
    description: "Mercado Livre", 
    category: "Compras", 
    amount: 458.90, 
    type: "expense", 
    date: "Hoje",
    icon: ShoppingBag 
  },
  { 
    id: "3", 
    description: "Aluguel", 
    category: "Moradia", 
    amount: 2800, 
    type: "expense", 
    date: "Ontem",
    icon: Home 
  },
  { 
    id: "4", 
    description: "Uber", 
    category: "Transporte", 
    amount: 42.50, 
    type: "expense", 
    date: "Ontem",
    icon: Car 
  },
  { 
    id: "5", 
    description: "Starbucks", 
    category: "Alimentação", 
    amount: 28.90, 
    type: "expense", 
    date: "2 dias atrás",
    icon: Coffee 
  },
];

export function RecentTransactions() {
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
        <button className="text-primary text-sm font-medium hover:underline">
          Ver todas
        </button>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 + index * 0.05 }}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                transaction.type === "income" 
                  ? "bg-accent/10 text-accent" 
                  : "bg-muted text-muted-foreground"
              )}>
                <transaction.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">{transaction.description}</p>
                <p className="text-muted-foreground text-xs">{transaction.category} • {transaction.date}</p>
              </div>
            </div>
            <span className={cn(
              "font-medium text-sm",
              transaction.type === "income" ? "text-accent" : "text-foreground"
            )}>
              {transaction.type === "income" ? "+" : "-"} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}