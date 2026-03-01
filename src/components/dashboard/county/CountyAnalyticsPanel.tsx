import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { Users, Leaf, Droplets, Zap } from "lucide-react";

const CountyAnalyticsPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["county-analytics-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["county-analytics-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = totalKg * 2.5;
  const waterSaved = totalKg * 18;
  const energySaved = totalKg * 5.8;

  // Weekly trend
  const weeklyData = (() => {
    const weeks: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const label = `W${12 - i}`;
      weeks[label] = 0;
    }
    const labels = Object.keys(weeks);
    collections?.forEach((c) => {
      const daysDiff = Math.floor((Date.now() - new Date(c.collected_at).getTime()) / (1000 * 60 * 60 * 24));
      const weekIdx = Math.floor(daysDiff / 7);
      if (weekIdx < 12) {
        const key = labels[11 - weekIdx];
        if (key) weeks[key] += Number(c.quantity);
      }
    });
    return Object.entries(weeks).map(([week, kg]) => ({ week, kg: Math.round(kg) }));
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
          { label: "Active Users", value: profiles?.length || 0, icon: Users, color: "text-primary" },
          { label: "CO₂ Offset", value: `${(co2Saved / 1000).toFixed(1)} t`, icon: Leaf, color: "text-primary" },
          { label: "Water Saved", value: `${(waterSaved / 1000).toFixed(0)} m³`, icon: Droplets, color: "text-sky-500" },
          { label: "Energy Saved", value: `${(energySaved / 1000).toFixed(1)} MWh`, icon: Zap, color: "text-secondary" },
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
        <CardHeader><CardTitle className="text-base">Weekly Collection Trend (12 weeks)</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" fontSize={11} />
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
