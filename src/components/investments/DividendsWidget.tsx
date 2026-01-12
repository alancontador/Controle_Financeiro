import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Plus, TrendingUp, Calendar, Loader2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Investment } from "@/hooks/useInvestments";
import { DividendModal } from "./DividendModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Dividend {
  id: string;
  user_id: string;
  investment_id: string | null;
  amount: number;
  payment_date: string;
  type: "dividend" | "jcp" | "rental";
  notes: string | null;
  created_at: string;
  updated_at: string;
  investment?: Investment;
}

interface DividendsWidgetProps {
  dividends: Dividend[];
  investments: Investment[];
  totalInvested: number;
  onCreateDividend: (data: Omit<Dividend, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'investment'>) => void;
  onUpdateDividend: (data: Partial<Dividend> & { id: string }) => void;
  onDeleteDividend: (id: string) => void;
  isLoading?: boolean;
}

const typeLabels: Record<string, string> = {
  dividend: "Dividendo",
  jcp: "JCP",
  rental: "Aluguel (FII)",
};

export function DividendsWidget({
  dividends,
  investments,
  totalInvested,
  onCreateDividend,
  onUpdateDividend,
  onDeleteDividend,
  isLoading,
}: DividendsWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Monthly dividend history (last 6 months)
  const monthlyDividends = useMemo(() => {
    const months: { month: string; total: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthLabel = format(monthStart, "MMM/yy", { locale: ptBR });

      const total = dividends
        .filter((d) => {
          const date = new Date(d.payment_date);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((acc, d) => acc + Number(d.amount), 0);

      months.push({ month: monthLabel, total });
    }

    return months;
  }, [dividends]);

  // Total received
  const totalReceived = useMemo(() => {
    return dividends.reduce((acc, d) => acc + Number(d.amount), 0);
  }, [dividends]);

  // Yield on cost
  const yieldOnCost = useMemo(() => {
    if (totalInvested <= 0) return 0;
    const last12MonthsDividends = dividends
      .filter((d) => {
        const date = new Date(d.payment_date);
        const oneYearAgo = subMonths(new Date(), 12);
        return date >= oneYearAgo;
      })
      .reduce((acc, d) => acc + Number(d.amount), 0);

    return (last12MonthsDividends / totalInvested) * 100;
  }, [dividends, totalInvested]);

  // Monthly average
  const monthlyAverage = useMemo(() => {
    const last6MonthsTotal = monthlyDividends.reduce((acc, m) => acc + m.total, 0);
    const monthsWithDividends = monthlyDividends.filter((m) => m.total > 0).length;
    return monthsWithDividends > 0 ? last6MonthsTotal / monthsWithDividends : 0;
  }, [monthlyDividends]);

  // Dividends by asset
  const dividendsByAsset = useMemo(() => {
    const byAsset: Record<string, { ticker: string; name: string; total: number }> = {};

    dividends.forEach((d) => {
      if (d.investment_id) {
        const investment = investments.find((i) => i.id === d.investment_id);
        if (investment) {
          if (!byAsset[investment.id]) {
            byAsset[investment.id] = {
              ticker: investment.ticker,
              name: investment.name,
              total: 0,
            };
          }
          byAsset[investment.id].total += Number(d.amount);
        }
      }
    });

    return Object.values(byAsset).sort((a, b) => b.total - a.total);
  }, [dividends, investments]);

  // Recent dividends
  const recentDividends = useMemo(() => {
    return [...dividends]
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 5);
  }, [dividends]);

  const handleEdit = (dividend: Dividend) => {
    setEditingDividend(dividend);
    setIsModalOpen(true);
  };

  const handleSave = (data: Omit<Dividend, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'investment'>) => {
    if (editingDividend) {
      onUpdateDividend({ id: editingDividend.id, ...data });
    } else {
      onCreateDividend(data);
    }
    setEditingDividend(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDeleteDividend(deleteId);
      setDeleteId(null);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-sm text-accent">
            R$ {payload[0].value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Dividendos & Proventos</h2>
              <p className="text-xs text-muted-foreground">Histórico e projeções</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingDividend(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Registrar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
            <p className="text-lg font-bold text-foreground">
              R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Yield on Cost</p>
            <p className="text-lg font-bold text-accent">
              {yieldOnCost.toFixed(2)}%
            </p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Média Mensal</p>
            <p className="text-lg font-bold text-foreground">
              R$ {monthlyAverage.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Projeção Anual</p>
            <p className="text-lg font-bold text-primary">
              R$ {(monthlyAverage * 12).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {dividends.length > 0 ? (
          <>
            {/* Monthly Chart */}
            <div className="h-40 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyDividends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${v}`}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Two columns: Top Assets & Recent Dividends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Paying Assets */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Maiores Pagadores
                </h3>
                <div className="space-y-2">
                  {dividendsByAsset.slice(0, 5).map((asset, index) => (
                    <div
                      key={asset.ticker}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{index + 1}.</span>
                        <span className="font-semibold text-foreground text-sm">{asset.ticker}</span>
                      </div>
                      <span className="text-accent text-sm font-medium">
                        R$ {asset.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  {dividendsByAsset.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Nenhum dividendo registrado
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Dividends */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Últimos Recebimentos
                </h3>
                <div className="space-y-2">
                  {recentDividends.map((dividend) => {
                    const investment = investments.find((i) => i.id === dividend.investment_id);
                    return (
                      <div
                        key={dividend.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 group"
                      >
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm">
                                {investment?.ticker || "—"}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {typeLabels[dividend.type]}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(dividend.payment_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-accent text-sm font-medium">
                            R$ {Number(dividend.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleEdit(dividend)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(dividend.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {recentDividends.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Nenhum dividendo registrado
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">Nenhum dividendo registrado</p>
            <p className="text-sm">Clique em "Registrar" para adicionar seu primeiro provento</p>
          </div>
        )}
      </motion.div>

      <DividendModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDividend(null);
        }}
        onSave={handleSave}
        dividend={editingDividend}
        investments={investments}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dividendo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este dividendo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
