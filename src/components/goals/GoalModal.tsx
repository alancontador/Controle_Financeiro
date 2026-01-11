import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, PiggyBank, Plane, Car, Home, GraduationCap, Shield, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Goal, GoalFormData } from "@/hooks/useGoals";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const goalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  target_amount: z.coerce.number().min(1, "Meta deve ser maior que 0"),
  current_amount: z.coerce.number().min(0, "Valor deve ser positivo"),
  deadline: z.string().optional(),
  category: z.string(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => Promise<void>;
  goal?: Goal | null;
  isLoading?: boolean;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
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

export function GoalModal({
  isOpen,
  onClose,
  onSubmit,
  goal,
  isLoading,
  categories,
}: GoalModalProps) {
  const isEditing = !!goal;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      description: "",
      target_amount: 0,
      current_amount: 0,
      deadline: "",
      category: "savings",
    },
  });

  const selectedCategory = watch("category");
  const categoryConfig = categories.find(c => c.value === selectedCategory) || categories[0];

  useEffect(() => {
    if (goal) {
      reset({
        name: goal.name,
        description: goal.description || "",
        target_amount: Number(goal.target_amount),
        current_amount: Number(goal.current_amount),
        deadline: goal.deadline || "",
        category: goal.category || "savings",
      });
    } else {
      reset({
        name: "",
        description: "",
        target_amount: 0,
        current_amount: 0,
        deadline: "",
        category: "savings",
      });
    }
  }, [goal, reset]);

  const handleFormSubmit = async (data: GoalFormValues) => {
    const config = categories.find(c => c.value === data.category) || categories[0];
    await onSubmit({
      name: data.name,
      description: data.description || null,
      target_amount: data.target_amount,
      current_amount: data.current_amount,
      deadline: data.deadline || null,
      category: data.category,
      icon: config.icon,
      color: config.color,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${categoryConfig.color}20` }}
            >
              {(() => {
                const Icon = iconMap[categoryConfig.icon] || Target;
                return <Icon className="w-5 h-5" style={{ color: categoryConfig.color }} />;
              })()}
            </div>
            {isEditing ? "Editar Meta" : "Nova Meta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">
              Nome da Meta
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Ex: Viagem para Europa"
              className="bg-secondary/50"
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-muted-foreground">
              Descrição (opcional)
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Detalhes sobre sua meta..."
              className="bg-secondary/50 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-muted-foreground">
              Categoria
            </Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setValue("category", value)}
            >
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {categories.map((cat) => {
                  const Icon = iconMap[cat.icon] || Target;
                  return (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount" className="text-muted-foreground">
                Valor da Meta (R$)
              </Label>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                {...register("target_amount")}
                className="bg-secondary/50"
              />
              {errors.target_amount && (
                <p className="text-destructive text-xs">{errors.target_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_amount" className="text-muted-foreground">
                Valor Atual (R$)
              </Label>
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                {...register("current_amount")}
                className="bg-secondary/50"
              />
              {errors.current_amount && (
                <p className="text-destructive text-xs">{errors.current_amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline" className="text-muted-foreground">
              Prazo (opcional)
            </Label>
            <Input
              id="deadline"
              type="date"
              {...register("deadline")}
              className="bg-secondary/50"
            />
          </div>

          <div className="flex gap-3 pt-4">
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
              disabled={isLoading}
              className="flex-1 glow-primary"
              style={{ backgroundColor: categoryConfig.color }}
            >
              {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Meta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
