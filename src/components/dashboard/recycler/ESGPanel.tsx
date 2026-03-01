import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Leaf, Factory, Droplets, Zap, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)"];

const ESGPanel = () => {
  const { user } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["recycler_esg", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;

  // Estimates
  const co2Saved = (totalKg * 2.5).toFixed(1);       // kg CO2 per kg recycled
  const waterSaved = (totalKg * 18).toFixed(0);       // liters water saved
  const energySaved = (totalKg * 5.8).toFixed(1);     // kWh saved
  const landfillDiverted = totalKg.toFixed(1);

  // Material breakdown for pie
  const materialMap = new Map<string, number>();
  collections?.forEach((c) => {
    const name = (c as any).material_types?.name || "Unknown";
    materialMap.set(name, (materialMap.get(name) || 0) + Number(c.quantity));
  });
  const pieData = Array.from(materialMap.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));

  // ESG score (simplified)
  const esgScore = Math.min(Math.round((totalKg / 1000) * 25 + 40), 100);

  return (
    <div className="space-y-6">
      {/* ESG Score */}
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-8 h-8 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">ESG Score</p>
              <p className="text-xs text-muted-foreground">Based on recycling volume and environmental impact</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Progress value={esgScore} className="flex-1 h-3" />
            <span className="text-lg font-bold text-primary">{esgScore}/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Impact metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Factory className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{co2Saved}</p>
            <p className="text-xs text-muted-foreground">kg CO₂ Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Droplets className="w-7 h-7 text-sky mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{Number(waterSaved).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Liters Water Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Zap className="w-7 h-7 text-accent mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{energySaved}</p>
            <p className="text-xs text-muted-foreground">kWh Energy Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{landfillDiverted}</p>
            <p className="text-xs text-muted-foreground">kg Landfill Diverted</p>
          </CardContent>
        </Card>
      </div>

      {/* Material breakdown */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Material Recovery Breakdown</CardTitle></CardHeader>
        <CardContent>
          {!pieData.length ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}kg`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} kg`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ESGPanel;
