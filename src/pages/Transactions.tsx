import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Loader2, ArrowUpRight, ArrowDownRight, Upload, Download, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions, Transaction } from "@/hooks/useTransactions";
import { useRecurringTransactions, RecurringTransaction } from "@/hooks/useRecurringTransactions";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { DeleteConfirmModal } from "@/components/transactions/DeleteConfirmModal";
import { ImportModal } from "@/components/transactions/ImportModal";
import { RecurringTransactionModal } from "@/components/transactions/RecurringTransactionModal";
import { RecurringTransactionList } from "@/components/transactions/RecurringTransactionList";
import { exportTransactions } from "@/utils/exportTransactions";

const Transactions = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    transactions,
    categories,
    loading,
    filters,
    setFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactions,
  } = useTransactions();

  const {
    recurringTransactions,
    loading: recurringLoading,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleActive,
  } = useRecurringTransactions();

  const [activeTab, setActiveTab] = useState("transactions");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [deletingRecurring, setDeletingRecurring] = useState<RecurringTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      const amount = Number(t.amount);
      if (t.type === "income") {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const handleSubmit = async (data: {
    description: string;
    amount: number;
    type: "income" | "expense";
    category_id: string | null;
    date: string;
    notes: string | null;
  }) => {
    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
      } else {
        await addTransaction(data);
      }
      setEditingTransaction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTransaction) return;
    setIsSubmitting(true);
    try {
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleImport = async (
    transactionsToImport: {
      description: string;
      amount: number;
      type: "income" | "expense";
      category_id: string | null;
      date: string;
      notes: string | null;
    }[]
  ) => {
    setIsSubmitting(true);
    try {
      await importTransactions(transactionsToImport);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recurring transaction handlers
  const handleRecurringSubmit = async (data: {
    description: string;
    amount: number;
    type: "income" | "expense";
    category_id: string | null;
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    day_of_month: number | null;
    day_of_week: number | null;
    next_execution_date: string;
    notes: string | null;
    is_active: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      if (editingRecurring) {
        await updateRecurringTransaction(editingRecurring.id, data);
      } else {
        await addRecurringTransaction(data);
      }
      setIsRecurringModalOpen(false);
      setEditingRecurring(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRecurring = (transaction: RecurringTransaction) => {
    setEditingRecurring(transaction);
    setIsRecurringModalOpen(true);
  };

  const handleDeleteRecurring = async () => {
    if (!deletingRecurring) return;
    setIsSubmitting(true);
    try {
      await deleteRecurringTransaction(deletingRecurring.id);
      setDeletingRecurring(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseRecurringModal = () => {
    setIsRecurringModalOpen(false);
    setEditingRecurring(null);
  };

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
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Transações
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie suas receitas e despesas
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={transactions.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => exportTransactions(transactions, { format: "csv" })}
                >
                  Exportar como CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportTransactions(transactions, { format: "xlsx" })}
                >
                  Exportar como Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="glow-primary w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
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
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-lg font-bold text-success">
                  R$ {totals.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-lg font-bold text-destructive">
                  R$ {totals.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                  totals.income - totals.expense >= 0
                    ? "bg-success/10"
                    : "bg-destructive/10"
                }`}
              >
                {totals.income - totals.expense >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-success" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p
                  className={`text-lg font-bold ${
                    totals.income - totals.expense >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  R${" "}
                  {(totals.income - totals.expense).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="recurring">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recorrentes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            {/* Filters */}
            <TransactionFilters
              filters={filters}
              setFilters={setFilters}
              categories={categories}
            />

            {/* Transaction List */}
            <TransactionList
              transactions={transactions}
              loading={loading}
              onEdit={handleEdit}
              onDelete={setDeletingTransaction}
            />
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setIsRecurringModalOpen(true)}
                className="glow-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Recorrente
              </Button>
            </div>

            <RecurringTransactionList
              transactions={recurringTransactions}
              loading={recurringLoading}
              onEdit={handleEditRecurring}
              onDelete={setDeletingRecurring}
              onToggleActive={toggleActive}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        categories={categories}
        transaction={editingTransaction}
        isLoading={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDelete}
        title="Excluir transação"
        description="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
        isLoading={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={!!deletingRecurring}
        onClose={() => setDeletingRecurring(null)}
        onConfirm={handleDeleteRecurring}
        title="Excluir transação recorrente"
        description="Tem certeza que deseja excluir esta transação recorrente? Esta ação não pode ser desfeita."
        isLoading={isSubmitting}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        categories={categories}
        isLoading={isSubmitting}
      />

      <RecurringTransactionModal
        isOpen={isRecurringModalOpen}
        onClose={handleCloseRecurringModal}
        onSubmit={handleRecurringSubmit}
        categories={categories}
        transaction={editingRecurring}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Transactions;
