import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { AssetComparison as AssetComparisonType } from "@/hooks/useInvestments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AssetComparisonProps {
  comparisons: AssetComparisonType[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 rounded-lg border border-border">
        <p className="text-foreground font-semibold">{label}</p>
        <p className="text-accent text-sm">+{payload[0]?.value}%</p>
      </div>
    );
  }
  return null;
};

export function AssetComparison({ comparisons }: AssetComparisonProps) {
  const data1Year = comparisons.map(c => ({
    name: c.name,
    value: c.year1,
    color: c.color,
  }));

  const data5Years = comparisons.map(c => ({
    name: c.name,
    value: c.year5,
    color: c.color,
  }));

  const data10Years = comparisons.map(c => ({
    name: c.name,
    value: c.year10,
    color: c.color,
  }));

  const renderChart = (data: typeof data1Year) => (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" horizontal={false} />
          <XAxis
            type="number"
            stroke="hsl(240 5% 65%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(240 5% 65%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(240 4% 16% / 0.5)' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="text-foreground font-semibold text-lg">Comparativo de Rentabilidade</h3>
          <p className="text-muted-foreground text-sm">Performance histórica de diferentes ativos</p>
        </div>
      </div>

      <Tabs defaultValue="1year" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="1year">1 Ano</TabsTrigger>
          <TabsTrigger value="5years">5 Anos</TabsTrigger>
          <TabsTrigger value="10years">10 Anos</TabsTrigger>
        </TabsList>

        <TabsContent value="1year">{renderChart(data1Year)}</TabsContent>
        <TabsContent value="5years">{renderChart(data5Years)}</TabsContent>
        <TabsContent value="10years">{renderChart(data10Years)}</TabsContent>
      </Tabs>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
        {comparisons.map((asset) => (
          <div key={asset.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: asset.color }}
            />
            <span className="text-muted-foreground text-sm">{asset.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
