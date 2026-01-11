import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Category } from "@/hooks/useTransactions";

interface CalendarCategoryFilterProps {
  categories: Category[];
  selectedCategories: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function CalendarCategoryFilter({
  categories,
  selectedCategories,
  onSelectionChange,
}: CalendarCategoryFilterProps) {
  const [open, setOpen] = useState(false);

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onSelectionChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onSelectionChange([...selectedCategories, categoryId]);
    }
  };

  const clearFilters = () => {
    onSelectionChange([]);
  };

  const selectAll = () => {
    onSelectionChange(categories.map((c) => c.id));
  };

  const selectByType = (type: "income" | "expense") => {
    const typeCategories = categories.filter((c) => c.type === type);
    onSelectionChange(typeCategories.map((c) => c.id));
  };

  const activeCount = selectedCategories.length;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Categorias</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-foreground">
                Filtrar por Categoria
              </h4>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectAll}
                >
                  Todas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearFilters}
                >
                  Limpar
                </Button>
              </div>
            </div>

            {/* Quick type filters */}
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs gap-1.5"
                onClick={() => selectByType("income")}
              >
                <div className="w-2 h-2 rounded-full bg-success" />
                Receitas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs gap-1.5"
                onClick={() => selectByType("expense")}
              >
                <div className="w-2 h-2 rounded-full bg-destructive" />
                Despesas
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="p-3 space-y-4">
              {/* Income categories */}
              {incomeCategories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Receitas
                  </p>
                  <div className="space-y-1">
                    {incomeCategories.map((category) => {
                      const isSelected = selectedCategories.includes(category.id);
                      return (
                        <motion.button
                          key={category.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => toggleCategory(category.id)}
                          className={`
                            w-full flex items-center justify-between p-2 rounded-lg transition-colors
                            ${isSelected ? "bg-success/10 border border-success/20" : "hover:bg-muted"}
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color || "#00C896" }}
                            />
                            <span className="text-sm text-foreground">
                              {category.name}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-success" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expense categories */}
              {expenseCategories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Despesas
                  </p>
                  <div className="space-y-1">
                    {expenseCategories.map((category) => {
                      const isSelected = selectedCategories.includes(category.id);
                      return (
                        <motion.button
                          key={category.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => toggleCategory(category.id)}
                          className={`
                            w-full flex items-center justify-between p-2 rounded-lg transition-colors
                            ${isSelected ? "bg-destructive/10 border border-destructive/20" : "hover:bg-muted"}
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color || "#FF4F4F" }}
                            />
                            <span className="text-sm text-foreground">
                              {category.name}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-destructive" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Active filters badges */}
      <AnimatePresence>
        {activeCount > 0 && activeCount <= 3 && (
          <div className="hidden sm:flex items-center gap-1">
            {selectedCategories.slice(0, 3).map((categoryId) => {
              const category = categories.find((c) => c.id === categoryId);
              if (!category) return null;
              return (
                <motion.div
                  key={categoryId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Badge
                    variant="outline"
                    className="gap-1 px-2 py-0.5 text-xs"
                    style={{
                      borderColor: category.color || undefined,
                      color: category.color || undefined,
                    }}
                  >
                    {category.name}
                    <button
                      onClick={() => toggleCategory(categoryId)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Clear all button */}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={clearFilters}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
