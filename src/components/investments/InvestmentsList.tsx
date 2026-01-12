import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit, Trash2, TrendingUp, TrendingDown, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Investment, InvestmentClass } from "@/hooks/useInvestments";
import { InvestmentModal } from "./InvestmentModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InvestmentsListProps {
  investments: Investment[];
  investmentClasses: InvestmentClass[];
  onCreateInvestment: (data: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'investment_class'>) => void;
  onUpdateInvestment: (data: Partial<Investment> & { id: string }) => void;
  onDeleteInvestment: (id: string) => void;
}

const typeLabels: Record<Investment['type'], string> = {
  stock_br: 'Ações BR',
  stock_us: 'Ações EUA',
  fixed_income: 'Renda Fixa',
  reits: 'FIIs',
  crypto: 'Cripto',
  etf_br: 'ETF BR',
  etf_us: 'ETF EUA',
};

export function InvestmentsList({
  investments,
  investmentClasses,
  onCreateInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
}: InvestmentsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredInvestments = investments.filter(inv =>
    inv.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setIsModalOpen(true);
  };

  const handleSave = (data: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'investment_class'>) => {
    if (editingInvestment) {
      onUpdateInvestment({ id: editingInvestment.id, ...data });
    } else {
      onCreateInvestment(data);
    }
    setEditingInvestment(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDeleteInvestment(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-lg">Meus Ativos</h3>
              <p className="text-muted-foreground text-sm">{investments.length} ativos cadastrados</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingInvestment(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ativos..."
            className="pl-10"
          />
        </div>

        {/* Investments List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredInvestments.length > 0 ? (
            filteredInvestments.map((inv, index) => {
              const value = inv.quantity * inv.current_price;
              const cost = inv.quantity * inv.average_price;
              const gain = value - cost;
              const gainPercent = cost > 0 ? (gain / cost) * 100 : 0;
              const investmentClass = inv.investment_class;

              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{inv.ticker}</span>
                        <Badge variant="secondary" className="text-xs">
                          {typeLabels[inv.type]}
                        </Badge>
                        {investmentClass && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: investmentClass.color }}
                            title={investmentClass.name}
                          />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.quantity.toLocaleString('pt-BR')} x {inv.currency === 'BRL' ? 'R$' : '$'} {inv.current_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {inv.currency === 'BRL' ? 'R$' : '$'} {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className={`flex items-center justify-end gap-1 text-sm ${gain >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        {gain >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>
                          {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEdit(inv)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(inv.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">
                {searchQuery ? 'Nenhum ativo encontrado' : 'Nenhum ativo cadastrado'}
              </p>
              <p className="text-sm">
                {searchQuery ? 'Tente buscar por outro termo' : 'Clique em "Adicionar" para incluir seu primeiro ativo'}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInvestment(null);
        }}
        onSave={handleSave}
        investment={editingInvestment}
        investmentClasses={investmentClasses}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ativo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este ativo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}