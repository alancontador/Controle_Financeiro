import { motion } from "framer-motion";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Category, TransactionFilters as Filters } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

interface TransactionFiltersProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  categories: Category[];
}

export function TransactionFilters({
  filters,
  setFilters,
  categories,
}: TransactionFiltersProps) {
  const hasActiveFilters =
    filters.type !== "all" ||
    filters.categoryId !== null ||
    filters.startDate !== null ||
    filters.endDate !== null;

  const clearFilters = () => {
    setFilters({
      ...filters,
      type: "all",
      categoryId: null,
      startDate: null,
      endDate: null,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-card p-4 mb-6"
    >
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3">
          {/* Type Filter */}
          <Select
            value={filters.type}
            onValueChange={(value: "all" | "income" | "expense") =>
              setFilters({ ...filters, type: value })
            }
          >
            <SelectTrigger className="w-[140px] bg-secondary/50 border-border/50">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={filters.categoryId || "all"}
            onValueChange={(value) =>
              setFilters({
                ...filters,
                categoryId: value === "all" ? null : value,
              })
            }
          >
            <SelectTrigger className="w-[160px] bg-secondary/50 border-border/50">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal bg-secondary/50 border-border/50",
                  !filters.startDate && "text-muted-foreground"
                )}
              >
                {filters.startDate
                  ? format(filters.startDate, "dd/MM/yyyy", { locale: ptBR })
                  : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate || undefined}
                onSelect={(date) =>
                  setFilters({ ...filters, startDate: date || null })
                }
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal bg-secondary/50 border-border/50",
                  !filters.endDate && "text-muted-foreground"
                )}
              >
                {filters.endDate
                  ? format(filters.endDate, "dd/MM/yyyy", { locale: ptBR })
                  : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate || undefined}
                onSelect={(date) =>
                  setFilters({ ...filters, endDate: date || null })
                }
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
