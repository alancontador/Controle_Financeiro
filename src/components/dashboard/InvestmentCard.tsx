import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Ações", value: 45, color: "hsl(255 75% 64%)" },
  { name: "Renda Fixa", value: 35, color: "hsl(160 100% 39%)" },
  { name: "FIIs", value: 15, color: "hsl(35 100% 50%)" },
  { name: "Cripto", value: 5, color: "hsl(200 100% 50%)" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-2 rounded-lg border border-border">
        <p className="text-foreground text-sm font-medium">
          {payload[0].name}: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export function InvestmentCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
      className="glass-card rounded-xl p-6"
    >
      <div className="mb-4">
        <h3 className="text-foreground font-semibold text-lg">Investimentos</h3>
        <p className="text-muted-foreground text-sm">Distribuição do portfólio</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-32 h-32 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-foreground font-bold text-sm">R$ 732k</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground text-sm">{item.name}</span>
              </div>
              <span className="text-foreground text-sm font-medium">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Rentabilidade</span>
          <span className="text-accent text-sm font-medium">+5.2% este mês</span>
        </div>
      </div>
    </motion.div>
  );
}