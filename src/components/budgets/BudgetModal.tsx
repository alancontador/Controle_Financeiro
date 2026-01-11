import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/hooks/useTransactions";
import { BudgetWithSpending } from "@/hooks/useBudgets";

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryId: string, amount: number) => Promise<void>;
  categories: Category[];
  budget?: BudgetWithSpending | null;
  isLoading?: boolean;
}

export function BudgetModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  budget,
  isLoading,
}: BudgetModalProps) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (budget) {
      setCategoryId(budget.category_id || "");
      setAmount(budget.amount.toString());
    } else {
      setCategoryId("");
      setAmount("");
    }
  }, [budget, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;

    await onSubmit(categoryId, parseFloat(amount));
    onClose();
  };

  const getIcon = (iconName: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const Icon = icons[iconName] || LucideIcons.Tag;
    return <Icon className="w-4 h-4" />;
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            {budget ? "Editar Orçamento" : "Novo Orçamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Category Select */}
          <div className="space-y-2">
            <Label className="text-foreground">Categoria</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={!!budget}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: category.color }}>
                        {getIcon(category.icon)}
                      </span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="text-foreground">Limite Mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="bg-secondary border-border text-lg"
            />
          </div>

          {/* Preview */}
          {selectedCategory && amount && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-secondary/50 border border-border"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${selectedCategory.color}20`,
                    color: selectedCategory.color,
                  }}
                >
                  {getIcon(selectedCategory.icon)}
                </div>
                <div>
                  <p className="text-foreground font-medium">{selectedCategory.name}</p>
                  <p className="text-muted-foreground text-sm">
                    Limite: R$ {parseFloat(amount || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={isLoading || !categoryId || !amount}
            >
              {isLoading ? "Salvando..." : budget ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
