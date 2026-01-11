import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions, Transaction } from "@/hooks/useTransactions";
import { useRecurringTransactions, RecurringTransaction } from "@/hooks/useRecurringTransactions";
import { CalendarTrends } from "@/components/calendar/CalendarTrends";
import { SpendingForecast } from "@/components/calendar/SpendingForecast";
import { CategoryComparison } from "@/components/calendar/CategoryComparison";
import { CalendarCategoryFilter, TransactionTypeFilter } from "@/components/calendar/CalendarCategoryFilter";
import { TopCategoriesSummary } from "@/components/calendar/TopCategoriesSummary";
import { useProfile } from "@/hooks/useProfile";

interface DayData {
  date: Date;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  totalIncome: number;
  totalExpense: number;
}

const CalendarView = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, categories, loading: transactionsLoading } = useTransactions();
  const { recurringTransactions, loading: recurringLoading } = useRecurringTransactions();
  const { profile } = useProfile();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Filter transactions based on selected categories and type
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((t) => 
        t.category_id && selectedCategories.includes(t.category_id)
      );
    }
    
    return filtered;
  }, [transactions, selectedCategories, typeFilter]);

  // Filter recurring transactions based on selected categories and type
  const filteredRecurringTransactions = useMemo(() => {
    let filtered = recurringTransactions;
    
    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.type === typeFilter);
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((r) =>
        r.category_id && selectedCategories.includes(r.category_id)
      );
    }
    
    return filtered;
  }, [recurringTransactions, selectedCategories, typeFilter]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { locale: ptBR });
    const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return days.map((date): DayData => {
      const dateStr = format(date, "yyyy-MM-dd");

      const dayTransactions = filteredTransactions.filter((t) => t.date === dateStr);
      const dayRecurring = filteredRecurringTransactions.filter(
        (r) => r.is_active && r.next_execution_date === dateStr
      );

      const totalIncome = dayTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpense = dayTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        date,
        transactions: dayTransactions,
        recurringTransactions: dayRecurring,
        totalIncome,
        totalExpense,
      };
    });
  }, [currentMonth, filteredTransactions, filteredRecurringTransactions]);

  const monthTotals = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthTransactions = filteredTransactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    return {
      income: monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      expense: monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0),
    };
  }, [currentMonth, filteredTransactions]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const loading = transactionsLoading || recurringLoading;
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                Calendário Financeiro
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Visualize suas transações e recorrências por dia
              </p>
            </div>
          </div>
          <CalendarCategoryFilter
            categories={categories}
            selectedCategories={selectedCategories}
            onSelectionChange={setSelectedCategories}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />
        </motion.div>

        {/* Month Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receitas do Mês</p>
                <p className="text-lg font-bold text-success">
                  R$ {monthTotals.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas do Mês</p>
                <p className="text-lg font-bold text-destructive">
                  R$ {monthTotals.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4 col-span-2 lg:col-span-1"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  monthTotals.income - monthTotals.expense >= 0
                    ? "bg-success/10"
                    : "bg-destructive/10"
                }`}
              >
                {monthTotals.income - monthTotals.expense >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-success" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo do Mês</p>
                <p
                  className={`text-lg font-bold ${
                    monthTotals.income - monthTotals.expense >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  R${" "}
                  {(monthTotals.income - monthTotals.expense).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Top Categories Summary */}
        <div className="mb-6">
          <TopCategoriesSummary
            transactions={transactions}
            categories={categories}
            currentMonth={currentMonth}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-4 lg:p-6"
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayData, index) => {
                  const hasTransactions = dayData.transactions.length > 0;
                  const hasRecurring = dayData.recurringTransactions.length > 0;
                  const isCurrentMonth = isSameMonth(dayData.date, currentMonth);
                  const isTodayDate = isToday(dayData.date);
                  const isSelected = selectedDay && isSameDay(dayData.date, selectedDay.date);

                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.005 }}
                      onClick={() => setSelectedDay(dayData)}
                      className={`
                        relative p-2 min-h-[70px] lg:min-h-[90px] rounded-lg border transition-all
                        ${!isCurrentMonth ? "opacity-40" : ""}
                        ${isTodayDate ? "border-primary bg-primary/5" : "border-border"}
                        ${isSelected ? "ring-2 ring-primary bg-primary/10" : ""}
                        ${hasTransactions || hasRecurring ? "hover:bg-secondary" : "hover:bg-muted/50"}
                      `}
                    >
                      <span
                        className={`text-sm font-medium ${
                          isTodayDate ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {format(dayData.date, "d")}
                      </span>

                      {/* Indicators */}
                      <div className="mt-1 space-y-1">
                        {dayData.totalIncome > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-success">
                            <ArrowUpRight className="w-3 h-3" />
                            <span className="hidden lg:inline">
                              +R$ {dayData.totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}
                        {dayData.totalExpense > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-destructive">
                            <ArrowDownRight className="w-3 h-3" />
                            <span className="hidden lg:inline">
                              -R$ {dayData.totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}
                        {hasRecurring && (
                          <div className="flex items-center gap-1 text-[10px] text-primary">
                            <RefreshCw className="w-3 h-3" />
                            <span className="hidden lg:inline">
                              {dayData.recurringTransactions.length}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Mobile dots */}
                      <div className="lg:hidden flex gap-0.5 mt-1">
                        {dayData.totalIncome > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        )}
                        {dayData.totalExpense > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        )}
                        {hasRecurring && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* Selected day details */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-x-4 bottom-4 lg:relative lg:inset-auto lg:mt-6 glass-card p-4 lg:p-6 z-40"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {format(selectedDay.date, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedDay(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {selectedDay.transactions.length === 0 &&
              selectedDay.recurringTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma transação neste dia
                </p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {/* Transactions */}
                    {selectedDay.transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              transaction.type === "income"
                                ? "bg-success/10"
                                : "bg-destructive/10"
                            }`}
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpRight className="w-4 h-4 text-success" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.category?.name || "Sem categoria"}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            transaction.type === "income"
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}R${" "}
                          {Number(transaction.amount).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ))}

                    {/* Recurring transactions */}
                    {selectedDay.recurringTransactions.map((recurring) => (
                      <div
                        key={recurring.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                            <RefreshCw className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {recurring.description}
                            </p>
                            <p className="text-xs text-primary">
                              Próxima execução automática
                            </p>
                          </div>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            recurring.type === "income"
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {recurring.type === "income" ? "+" : "-"}R${" "}
                          {Number(recurring.amount).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trends, Forecast and Comparison Tabs */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-xl mb-6">
              <TabsTrigger value="calendar">Tendências</TabsTrigger>
              <TabsTrigger value="forecast">Previsão</TabsTrigger>
              <TabsTrigger value="comparison">Comparação</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <CalendarTrends transactions={filteredTransactions} currentMonth={currentMonth} />
            </TabsContent>

            <TabsContent value="forecast">
              <SpendingForecast
                transactions={filteredTransactions}
                recurringTransactions={filteredRecurringTransactions}
                monthlyBudget={profile?.monthly_budget || 0}
              />
            </TabsContent>

            <TabsContent value="comparison">
              <CategoryComparison 
                transactions={transactions} 
                categories={categories} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CalendarView;
