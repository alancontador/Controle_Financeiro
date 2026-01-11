import { motion } from "framer-motion";
import { Plus, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user } = useAuth();
  
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const userName = user?.email?.split('@')[0] || 'Comandante';

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8 gap-4"
    >
      <div>
        <h1 className="text-foreground text-xl lg:text-2xl font-bold tracking-tight">
          Bem-vindo, <span className="text-gradient capitalize">{userName}</span>
        </h1>
        <p className="text-muted-foreground text-xs lg:text-sm capitalize mt-1">{currentDate}</p>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="relative flex-1 lg:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar..."
            className="pl-10 w-full lg:w-64 bg-secondary border-border focus:border-primary"
          />
        </div>
        
        <button className="relative p-2 rounded-lg bg-secondary hover:bg-muted transition-colors shrink-0">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>

        <Button className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground gap-2 glow-primary shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">Nova Transação</span>
        </Button>
        
        <Button size="icon" className="sm:hidden bg-primary hover:bg-primary/90 text-primary-foreground glow-primary shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </motion.header>
  );
}
