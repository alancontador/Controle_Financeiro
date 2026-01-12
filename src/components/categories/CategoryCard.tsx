import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Pencil, Trash2, TrendingUp, TrendingDown, ChevronRight, ChevronDown, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Category, CategoryWithChildren } from "@/hooks/useCategories";
import { Badge } from "@/components/ui/badge";

interface CategoryCardProps {
  category: CategoryWithChildren;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  index: number;
  level?: number;
}

export function CategoryCard({ category, onEdit, onDelete, index, level = 0 }: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const IconComponent = (LucideIcons as any)[category.icon] || LucideIcons.Tag;
  const hasChildren = category.children.length > 0;

  return (
    <div className={level > 0 ? "ml-6 border-l-2 border-border/50 pl-4" : ""}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        className="glass-card rounded-xl p-4 flex items-center justify-between group hover:border-primary/30 transition-colors mb-2"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}
          
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <IconComponent className="w-5 h-5" style={{ color: category.color }} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground truncate">{category.name}</p>
              {hasChildren && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <FolderTree className="w-3 h-3 mr-1" />
                  {category.children.length}
                </Badge>
              )}
            </div>
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
              {level > 0 && (
                <span className="text-xs text-muted-foreground ml-2">• Subcategoria</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {category.children.map((child, childIndex) => (
              <CategoryCard
                key={child.id}
                category={child}
                onEdit={onEdit}
                onDelete={onDelete}
                index={index + childIndex + 1}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
