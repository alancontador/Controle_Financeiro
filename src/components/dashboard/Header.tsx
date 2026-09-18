import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransactions } from "@/hooks/useTransactions";

export function Header() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { categories, addTransaction } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  // A busca do cabecalho abre as transacoes ja filtradas pelo termo.
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/transactions?q=${encodeURIComponent(q)}` : "/transactions");
  };
  
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

  const handleAddTransaction = async (data: {
    description: string;
    amount: number;
    type: "income" | "expense";
    category_id: string | null;
    date: string;
    notes: string | null;
  }) => {
    setIsSubmitting(true);
    await addTransaction(data);
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8 gap-4 min-w-0"
      >
        <div className="min-w-0">
          <h1 className="text-foreground text-xl lg:text-2xl font-bold tracking-tight">
            Bem-vindo, <span className="text-gradient capitalize">{userName}</span>
          </h1>
          <p className="text-muted-foreground text-xs lg:text-sm capitalize mt-1">{currentDate}</p>
        </div>

        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <form onSubmit={submitSearch} className="relative flex-1 lg:flex-none min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar transação..."
              aria-label="Buscar transação"
              className="pl-10 w-full lg:w-44 xl:w-64 bg-secondary border-border focus:border-primary"
            />
          </form>

          <ThemeToggle />

          <Button 
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground gap-2 glow-primary shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Nova Transação</span>
          </Button>
          
          <Button 
            size="icon" 
            onClick={() => setIsModalOpen(true)}
            className="sm:hidden bg-primary hover:bg-primary/90 text-primary-foreground glow-primary shrink-0"
          >
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

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
        categories={categories}
        isLoading={isSubmitting}
      />
    </>
  );
}
