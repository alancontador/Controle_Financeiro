import { useState } from "react";
import { Target, PiggyBank, Plane, Car, Home, GraduationCap, Shield, Wallet, Plus } from "lucide-react";
import { Goal } from "@/hooks/useGoals";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goalId: string, amount: number) => Promise<void>;
  goal: Goal | null;
  isLoading?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  Target,
  PiggyBank,
  Plane,
  Car,
  Home,
  GraduationCap,
  Shield,
  Wallet,
};

export function ContributionModal({
  isOpen,
  onClose,
  onSubmit,
  goal,
  isLoading,
}: ContributionModalProps) {
  const [amount, setAmount] = useState("");

  if (!goal) return null;

  const Icon = iconMap[goal.icon || 'Target'] || Target;
  const currentProgress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);
  const contributionAmount = parseFloat(amount) || 0;
  const newAmount = Number(goal.current_amount) + contributionAmount;
  const newProgress = Math.min((newAmount / Number(goal.target_amount)) * 100, 100);
  const willComplete = newAmount >= Number(goal.target_amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contributionAmount > 0) {
      await onSubmit(goal.id, contributionAmount);
      setAmount("");
      onClose();
    }
  };

  const quickAmounts = [100, 500, 1000, remaining].filter(v => v > 0 && v <= remaining);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${goal.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: goal.color }} />
            </div>
            Adicionar Aporte
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Goal info */}
          <div className="p-4 rounded-lg bg-secondary/30">
            <p className="text-foreground font-medium">{goal.name}</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso atual</span>
                <span className="text-foreground">
                  R$ {Number(goal.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                  R$ {Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Progress value={currentProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Faltam R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para completar
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-muted-foreground">
                Valor do Aporte (R$)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="bg-secondary/50 text-lg"
                autoFocus
              />
            </div>

            {/* Quick amount buttons */}
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="text-xs"
                >
                  {quickAmount === remaining 
                    ? "Completar" 
                    : `R$ ${quickAmount.toLocaleString('pt-BR')}`
                  }
                </Button>
              ))}
            </div>

            {/* Preview */}
            {contributionAmount > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">Após o aporte:</p>
                <Progress value={newProgress} className="h-2 mb-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">
                    R$ {newAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span style={{ color: goal.color }} className="font-semibold">
                    {newProgress.toFixed(1)}%
                  </span>
                </div>
                {willComplete && (
                  <p className="text-accent text-xs mt-2 font-medium">
                    🎉 Você irá completar esta meta!
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || contributionAmount <= 0}
                className="flex-1 glow-primary"
                style={{ backgroundColor: goal.color }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isLoading ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
