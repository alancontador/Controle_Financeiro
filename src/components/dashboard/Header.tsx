import { motion } from "framer-motion";
import { Plus, Bell, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export function Header() {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Comandante';

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

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

        <ThemeToggle />
        
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

        <Link to="/settings" className="shrink-0">
          <Avatar className="w-9 h-9 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </motion.header>
  );
}
