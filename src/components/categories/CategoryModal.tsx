import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Category } from "@/hooks/useCategories";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Category, "id" | "user_id" | "created_at">) => void;
  category?: Category | null;
}

const availableIcons = [
  "Wallet", "CreditCard", "Banknote", "PiggyBank", "Coins",
  "DollarSign", "CircleDollarSign", "Receipt", "FileText",
  "Home", "Building", "Building2", "Car", "CarFront", "Plane",
  "Train", "Bus", "Bike", "Fuel",
  "ShoppingCart", "ShoppingBag", "Gift", "Package",
  "UtensilsCrossed", "ChefHat", "Coffee", "Pizza",
  "Heart", "HeartPulse", "Stethoscope", "Pill", "Activity",
  "GraduationCap", "BookOpen", "Library", "School",
  "Briefcase", "Laptop", "Monitor", "Smartphone",
  "Users", "Users2", "UserCog", "Baby", "PawPrint",
  "Shirt", "Sparkles", "Scissors",
  "Dumbbell", "Gamepad2", "Music", "Film", "Camera",
  "Palette", "Brush", "PenTool",
  "Wrench", "Hammer", "Settings", "Tool",
  "Shield", "Lock", "Key",
  "TrendingUp", "TrendingDown", "BarChart", "PieChart",
  "Target", "Award", "Trophy", "Star",
  "Sun", "Moon", "Cloud", "Umbrella",
  "Palmtree", "Mountain", "TreeDeciduous",
  "MapPin", "Compass", "Navigation",
  "Phone", "Mail", "MessageSquare",
  "Bell", "Calendar", "CalendarCheck", "Clock",
  "Tag", "Bookmark", "Flag",
  "AlertCircle", "HelpCircle", "Info",
  "ArrowLeftRight", "RotateCcw", "RefreshCw",
  "MoreHorizontal", "FolderOpen", "FileBox",
  "Landmark", "Megaphone",
];

const colorOptions = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
  "#F43F5E", "#78716C", "#6B7280", "#64748B",
];

export function CategoryModal({ isOpen, onClose, onSubmit, category }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [icon, setIcon] = useState("Tag");
  const [color, setColor] = useState("#6366F1");
  const [iconSearch, setIconSearch] = useState("");

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type);
      setIcon(category.icon);
      setColor(category.color);
    } else {
      setName("");
      setType("expense");
      setIcon("Tag");
      setColor("#6366F1");
    }
    setIconSearch("");
  }, [category, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      type,
      icon,
      color,
    });
    onClose();
  };

  const filteredIcons = availableIcons.filter((iconName) =>
    iconName.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Tag;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {category ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview */}
          <div className="flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-3 px-6 py-4 rounded-xl bg-secondary/50"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <IconComponent className="w-6 h-6" style={{ color }} />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {name || "Nome da categoria"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {type === "income" ? "Receita" : "Despesa"}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alimentação, Salário..."
              maxLength={50}
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="income">
                  <span className="flex items-center gap-2">
                    <LucideIcons.TrendingUp className="w-4 h-4 text-accent" />
                    Receita
                  </span>
                </SelectItem>
                <SelectItem value="expense">
                  <span className="flex items-center gap-2">
                    <LucideIcons.TrendingDown className="w-4 h-4 text-destructive" />
                    Despesa
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-10 gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="customColor" className="text-sm text-muted-foreground">
                Cor personalizada:
              </Label>
              <Input
                id="customColor"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-8 p-0 border-0 cursor-pointer"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-24 h-8 text-sm"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <Input
              placeholder="Buscar ícone..."
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-40 rounded-lg border border-border p-2">
              <div className="grid grid-cols-8 gap-2">
                {filteredIcons.map((iconName) => {
                  const Icon = (LucideIcons as any)[iconName];
                  if (!Icon) return null;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      className={`p-2 rounded-lg transition-all ${
                        icon === iconName
                          ? "bg-primary/20 ring-2 ring-primary"
                          : "hover:bg-secondary"
                      }`}
                      title={iconName}
                    >
                      <Icon className="w-5 h-5" style={{ color: icon === iconName ? color : undefined }} />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 glow-primary">
              {category ? "Salvar" : "Criar Categoria"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
