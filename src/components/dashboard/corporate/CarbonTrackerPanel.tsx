import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Factory, TrendingDown, Target, Flame } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, subMonths } from "date-fns";
import { useTranslation } from "react-i18next";

const CarbonTrackerPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["corp_carbon_collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Offset = totalKg * 2.5;
  const annualCarbonTarget = 12500; // kg CO2
  const progress = Math.min((co2Offset / annualCarbonTarget) * 100, 100);

  // Baseline vs offset
  const baselineEmissions = 50000; // company baseline kg CO2/year
  const netEmissions = baselineEmissions - co2Offset;
  const reductionPct = ((co2Offset / baselineEmissions) * 100).toFixed(1);

  // Monthly carbon offset
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(new Date(), 11 - i);
    const monthStr = format(month, "yyyy-MM");
    const qty = collections?.filter((c) => format(new Date(c.collected_at), "yyyy-MM") === monthStr)
      .reduce((s, c) => s + Number(c.quantity), 0) || 0;
    const co2 = qty * 2.5;
    const cumulative = collections?.filter((c) => format(new Date(c.collected_at), "yyyy-MM") <= monthStr)
      .reduce((s, c) => s + Number(c.quantity) * 2.5, 0) || 0;
    return { month: format(month, "MMM"), offset: Math.round(co2), cumulative: Math.round(cumulative) };
  });

  return (
    <div className="space-y-6">
      {/* Progress to target */}
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Factory className="w-8 h-8 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">Carbon Reduction Target</p>
              <p className="text-xs text-muted-foreground">{co2Offset.toFixed(0)} / {annualCarbonTarget.toLocaleString()} kg CO₂ offset</p>
            </div>
          </div>
          <Progress value={progress} className="h-4" />
          <p className="text-sm font-medium text-foreground mt-2">{progress.toFixed(1)}% of annual target</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{co2Offset.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">kg CO₂ Offset</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Flame className="w-7 h-7 text-destructive mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{baselineEmissions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Baseline (kg CO₂)</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Factory className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{netEmissions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Net Emissions</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Target className="w-7 h-7 text-accent mx-auto mb-2" />
            <p className="text-xl font-bold text-primary">{reductionPct}%</p>
            <p className="text-xs text-muted-foreground">Reduction</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Monthly CO₂ Offset</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v} kg CO₂`} />
                <Area type="monotone" dataKey="offset" fill="hsl(152,45%,22%)" fillOpacity={0.2} stroke="hsl(152,45%,22%)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Cumulative Offset</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v} kg CO₂`} />
                <Line type="monotone" dataKey="cumulative" stroke="hsl(40,55%,55%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CarbonTrackerPanel;
