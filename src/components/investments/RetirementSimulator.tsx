import { motion } from "framer-motion";
import { Calculator, Banknote, CalendarClock, Percent, TrendingDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { RetirementSimulation } from "@/hooks/useInvestments";

interface RetirementSimulatorProps {
  simulation: RetirementSimulation;
  updateSimulation: (updates: Partial<RetirementSimulation>) => void;
  retirementIncome: number;
}

export function RetirementSimulator({
  simulation,
  updateSimulation,
  retirementIncome,
}: RetirementSimulatorProps) {
  const yearsToRetirement = simulation.retirementAge - simulation.currentAge;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-foreground font-semibold text-lg">Simulador de Aposentadoria</h3>
          <p className="text-muted-foreground text-sm">Planeje seu futuro financeiro</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Current Age */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              Idade Atual
            </Label>
            <span className="text-foreground font-semibold">{simulation.currentAge} anos</span>
          </div>
          <Slider
            value={[simulation.currentAge]}
            onValueChange={([value]) => updateSimulation({ currentAge: value })}
            min={18}
            max={70}
            step={1}
            className="w-full"
          />
        </div>

        {/* Retirement Age */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              Idade de Aposentadoria
            </Label>
            <span className="text-foreground font-semibold">{simulation.retirementAge} anos</span>
          </div>
          <Slider
            value={[simulation.retirementAge]}
            onValueChange={([value]) => updateSimulation({ retirementAge: value })}
            min={simulation.currentAge + 1}
            max={80}
            step={1}
            className="w-full"
          />
        </div>

        {/* Current Savings */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            Patrimônio Atual (R$)
          </Label>
          <Input
            type="number"
            value={simulation.currentSavings}
            onChange={(e) => updateSimulation({ currentSavings: Number(e.target.value) })}
            className="bg-secondary/50"
          />
        </div>

        {/* Monthly Contribution */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            Aporte Mensal (R$)
          </Label>
          <Input
            type="number"
            value={simulation.monthlyContribution}
            onChange={(e) => updateSimulation({ monthlyContribution: Number(e.target.value) })}
            className="bg-secondary/50"
          />
        </div>

        {/* Expected Return */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-sm flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Rentabilidade Esperada (a.a.)
            </Label>
            <span className="text-accent font-semibold">{simulation.expectedReturn}%</span>
          </div>
          <Slider
            value={[simulation.expectedReturn]}
            onValueChange={([value]) => updateSimulation({ expectedReturn: value })}
            min={4}
            max={20}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Inflation Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Inflação Estimada (a.a.)
            </Label>
            <span className="text-destructive font-semibold">{simulation.inflationRate}%</span>
          </div>
          <Slider
            value={[simulation.inflationRate]}
            onValueChange={([value]) => updateSimulation({ inflationRate: value })}
            min={2}
            max={10}
            step={0.5}
            className="w-full"
          />
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-muted-foreground text-xs mb-1">Anos até aposentadoria</p>
            <p className="text-primary font-bold text-2xl">{yearsToRetirement}</p>
          </div>
          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-muted-foreground text-xs mb-1">Renda Mensal Estimada</p>
            <p className="text-accent font-bold text-2xl">
              R$ {retirementIncome.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
