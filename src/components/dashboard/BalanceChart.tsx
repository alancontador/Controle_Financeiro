import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const data = [
  { month: "Jul", receitas: 8500, despesas: 6200 },
  { month: "Ago", receitas: 9200, despesas: 5800 },
  { month: "Set", receitas: 8800, despesas: 7100 },
  { month: "Out", receitas: 10500, despesas: 6400 },
  { month: "Nov", receitas: 11200, despesas: 7200 },
  { month: "Dez", receitas: 13500, despesas: 8900 },
  { month: "Jan", receitas: 12800, despesas: 7600 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 rounded-lg border border-border">
        <p className="text-foreground font-medium mb-2">{label}</p>
        <p className="text-accent text-sm">
          Receitas: R$ {payload[0].value.toLocaleString('pt-BR')}
        </p>
        <p className="text-destructive text-sm">
          Despesas: R$ {payload[1].value.toLocaleString('pt-BR')}
        </p>
      </div>
    );
  }
  return null;
};

export function BalanceChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      className="glass-card rounded-xl p-6 col-span-2"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-foreground font-semibold text-lg">Despesas vs Receitas</h3>
          <p className="text-muted-foreground text-sm">Últimos 7 meses</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-muted-foreground">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Despesas</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160 100% 39%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(160 100% 39%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 72% 65%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(0 72% 65%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(240 5% 65%)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(240 5% 65%)', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="receitas"
              stroke="hsl(160 100% 39%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorReceitas)"
            />
            <Area
              type="monotone"
              dataKey="despesas"
              stroke="hsl(0 72% 65%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDespesas)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}