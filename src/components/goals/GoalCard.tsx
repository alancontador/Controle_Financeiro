import { motion } from "framer-motion";
import { 
  Target, 
  PiggyBank, 
  Plane, 
  Car, 
  Home, 
  GraduationCap, 
  Shield, 
  Wallet,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { Goal } from "@/hooks/useGoals";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onAddContribution: (goal: Goal) => void;
  index: number;
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

export function GoalCard({ goal, onEdit, onDelete, onAddContribution, index }: GoalCardProps) {
  const Icon = iconMap[goal.icon || 'Target'] || Target;
  const progress = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100);
  const remaining = Math.max(Number(goal.target_amount) - Number(goal.current_amount), 0);
  
  const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
  const daysRemaining = deadlineDate ? differenceInDays(deadlineDate, new Date()) : null;
  const isOverdue = deadlineDate ? isPast(deadlineDate) && !goal.is_completed : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`glass-card rounded-xl p-5 relative overflow-hidden ${
        goal.is_completed ? 'ring-2 ring-accent/50' : ''
      }`}
    >
      {/* Completed badge */}
      {goal.is_completed && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Concluída
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${goal.color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: goal.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-foreground font-semibold text-base truncate">{goal.name}</h3>
              {goal.description && (
                <p className="text-muted-foreground text-sm line-clamp-1 mt-0.5">
                  {goal.description}
                </p>
              )}
            </div>

            {!goal.is_completed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border">
                  <DropdownMenuItem onClick={() => onAddContribution(goal)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Aporte
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(goal)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(goal)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            R$ {Number(goal.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-foreground font-medium">
            R$ {Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <Progress 
          value={progress} 
          className="h-2"
          style={{ 
            '--progress-color': goal.color 
          } as React.CSSProperties}
        />
        <div className="flex items-center justify-between text-xs">
          <span 
            className="font-semibold"
            style={{ color: goal.color }}
          >
            {progress.toFixed(1)}%
          </span>
          {!goal.is_completed && (
            <span className="text-muted-foreground">
              Faltam R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Deadline */}
      {deadlineDate && !goal.is_completed && (
        <div className={`mt-3 flex items-center gap-2 text-xs ${
          isOverdue ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          <Calendar className="w-3 h-3" />
          <span>
            {isOverdue 
              ? 'Prazo expirado' 
              : daysRemaining === 0 
                ? 'Último dia' 
                : `${daysRemaining} dias restantes`
            }
          </span>
          <span className="text-muted-foreground">
            ({format(deadlineDate, "dd/MM/yyyy", { locale: ptBR })})
          </span>
        </div>
      )}

      {/* Completed date */}
      {goal.is_completed && goal.completed_at && (
        <div className="mt-3 flex items-center gap-2 text-xs text-accent">
          <CheckCircle2 className="w-3 h-3" />
          <span>
            Concluída em {format(new Date(goal.completed_at), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
      )}
    </motion.div>
  );
}
