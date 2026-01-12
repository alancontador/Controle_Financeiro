import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Category } from "@/hooks/useCategories";

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  index: number;
}

export function CategoryCard({ category, onEdit, onDelete, index }: CategoryCardProps) {
  const IconComponent = (LucideIcons as any)[category.icon] || LucideIcons.Tag;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="glass-card rounded-xl p-4 flex items-center justify-between group hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <IconComponent className="w-5 h-5" style={{ color: category.color }} />
        </div>
        <div>
          <p className="font-medium text-foreground">{category.name}</p>
          <div className="flex items-center gap-1">
            {category.type === "income" ? (
              <>
                <TrendingUp className="w-3 h-3 text-accent" />
                <span className="text-xs text-accent">Receita</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-destructive" />
                <span className="text-xs text-destructive">Despesa</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(category)}
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(category.id)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
