import { motion } from "framer-motion";
import { Plus, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Header() {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between mb-8"
    >
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Bem-vindo de volta, <span className="text-gradient">Comandante</span>
        </h1>
        <p className="text-muted-foreground text-sm capitalize mt-1">{currentDate}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar transações..."
            className="pl-10 w-64 bg-secondary border-border focus:border-primary"
          />
        </div>
        
        <button className="relative p-2 rounded-lg bg-secondary hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>

        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 glow-primary">
          <Plus className="w-4 h-4" />
          Nova Transação
        </Button>
      </div>
    </motion.header>
  );
}