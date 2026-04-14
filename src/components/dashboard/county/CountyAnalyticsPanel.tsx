import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, Leaf, Droplets, Zap } from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useTranslation } from "react-i18next";

const CountyAnalyticsPanel = () => {
  const { t } = useTranslation();
  const { derived } = usePlatformStats();

  const d = derived ?? {
    totalKg: 0, co2Avoided: 0, waterSaved: 0, energySaved: 0,
    totalUsers: 0, monthlyTrend: [],
  };

  // Weekly trend from monthly data (simplified)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - i);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }
    d.monthlyTrend.forEach((m) => {
      if (months[m.month] !== undefined) months[m.month] = Math.round(m.kg);
    });
    return Object.entries(months).map(([month, kg]) => ({ month: month.slice(5), kg }));
  })();

  const chartConfig = { kg: { label: "Kg", color: "hsl(152,45%,22%)" } };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">County Analytics</h2>
        <p className="text-muted-foreground">Environmental impact and operational metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Users", value: d.totalUsers, icon: Users, color: "text-primary" },
          { label: "CO₂ Offset", value: `${(d.co2Avoided / 1000).toFixed(1)} t`, icon: Leaf, color: "text-primary" },
          { label: "Water Saved", value: `${(d.waterSaved / 1000).toFixed(0)} m³`, icon: Droplets, color: "text-sky-500" },
          { label: "Energy Saved", value: `${(d.energySaved / 1000).toFixed(1)} MWh`, icon: Zap, color: "text-secondary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Collection Trend (12 months)</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="kg" stroke="hsl(152,45%,22%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default CountyAnalyticsPanel;
