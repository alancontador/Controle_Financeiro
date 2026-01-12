import { useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Wallet, Target, BarChart3, Plus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvestmentClass } from "@/hooks/useInvestments";
import { InvestmentClassModal } from "./InvestmentClassModal";

interface AllocationData {
  id: string;
  name: string;
  value: number;
  color: string;
  target: number;
  percentage: number;
}

interface PortfolioOverviewProps {
  investmentClasses: InvestmentClass[];
  allocationByClass: AllocationData[];
  totalValue: number;
  averageMonthlyReturn: number;
  onCreateClass: (data: Omit<InvestmentClass, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdateClass: (data: Partial<InvestmentClass> & { id: string }) => void;
  onDeleteClass: (id: string) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 rounded-lg border border-border">
        <p className="text-foreground text-sm font-semibold">{payload[0].name}</p>
        <p className="text-muted-foreground text-xs">
          R$ {payload[0].payload.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-primary text-xs font-medium">{payload[0].payload.percentage.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export function PortfolioOverview({
  investmentClasses,
  allocationByClass,
  totalValue,
  averageMonthlyReturn,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
}: PortfolioOverviewProps) {
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<InvestmentClass | null>(null);

  const chartData = allocationByClass.filter(a => a.value > 0).map(allocation => ({
    name: allocation.name,
    value: allocation.value,
    percentage: allocation.percentage,
    color: allocation.color,
  }));

  const handleEditClass = (cls: InvestmentClass) => {
    setEditingClass(cls);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (data: Omit<InvestmentClass, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingClass) {
      onUpdateClass({ id: editingClass.id, ...data });
    } else {
      onCreateClass(data);
    }
    setEditingClass(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-lg">Portfólio</h3>
              <p className="text-muted-foreground text-sm">Distribuição por classe</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingClass(null);
              setIsClassModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Classe
          </Button>
        </div>

        {chartData.length > 0 ? (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Pie Chart */}
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="text-foreground font-bold text-lg">
                    R$ {(totalValue / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
            </div>

            {/* Class List */}
            <div className="flex-1 w-full space-y-2">
              {investmentClasses.map((cls, index) => {
                const allocation = allocationByClass.find(a => a.id === cls.id);
                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cls.color }}
                      />
                      <div>
                        <p className="text-foreground text-sm font-medium">{cls.name}</p>
                        <p className="text-muted-foreground text-xs">
                          R$ {(allocation?.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <p className="text-foreground text-sm font-semibold">
                          {(allocation?.percentage || 0).toFixed(1)}%
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Meta: {cls.target_allocation}%
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEditClass(cls)}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDeleteClass(cls.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">Nenhuma classe de ativo cadastrada</p>
            <p className="text-sm">Clique em "+ Classe" para criar sua primeira classe de ativos</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <p className="text-foreground font-bold text-lg">
              {averageMonthlyReturn >= 0 ? '+' : ''}{averageMonthlyReturn.toFixed(2)}%
            </p>
            <p className="text-muted-foreground text-xs">Rent. Média/Mês</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <p className="text-foreground font-bold text-lg">{investmentClasses.length}</p>
            <p className="text-muted-foreground text-xs">Classes de Ativo</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="w-4 h-4 text-warning" />
            </div>
            <p className="text-foreground font-bold text-lg">
              {averageMonthlyReturn !== 0
                ? `${((Math.pow(1 + Math.abs(averageMonthlyReturn) / 100, 12) - 1) * 100 * (averageMonthlyReturn >= 0 ? 1 : -1)).toFixed(1)}%`
                : '0%'}
            </p>
            <p className="text-muted-foreground text-xs">Rent. Anual Est.</p>
          </div>
        </div>
      </motion.div>

      <InvestmentClassModal
        isOpen={isClassModalOpen}
        onClose={() => {
          setIsClassModalOpen(false);
          setEditingClass(null);
        }}
        onSave={handleSaveClass}
        investmentClass={editingClass}
      />
    </>
  );
}