import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Leaf, Factory, Droplets, Zap, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subMonths } from "date-fns";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)"];

const ESGAnalyticsPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["corp_esg_collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pickers } = useQuery({
    queryKey: ["corp_esg_pickers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_roles!inner(role)")
        .eq("user_roles.role", "waste_picker");
      if (error) throw error;
      return data;
    },
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = totalKg * 2.5;
  const waterSaved = totalKg * 18;
  const energySaved = totalKg * 5.8;

  // ESG pillars
  const envScore = Math.min(Math.round((totalKg / 5000) * 50 + 30), 100);
  const socScore = Math.min(Math.round(((pickers?.length || 0) / 50) * 40 + 40), 100);
  const govScore = 75; // baseline
  const overallESG = Math.round((envScore + socScore + govScore) / 3);

  // Monthly trend
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(new Date(), 11 - i);
    const monthStr = format(month, "yyyy-MM");
    const qty = collections?.filter((c) => format(new Date(c.collected_at), "yyyy-MM") === monthStr)
      .reduce((s, c) => s + Number(c.quantity), 0) || 0;
    return { month: format(month, "MMM"), kg: Math.round(qty), co2: Math.round(qty * 2.5) };
  });

  // Material pie
  const materialMap = new Map<string, number>();
  collections?.forEach((c) => {
    const name = (c as any).material_types?.name || "Unknown";
    materialMap.set(name, (materialMap.get(name) || 0) + Number(c.quantity));
  });
  const pieData = Array.from(materialMap.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));

  return (
    <div className="space-y-6">
      {/* ESG Score */}
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-8 h-8 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">ESG Score: {overallESG}/100</p>
              <p className="text-xs text-muted-foreground">Environmental, Social & Governance composite</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Environmental</span>
                <span className="font-medium text-foreground">{envScore}</span>
              </div>
              <Progress value={envScore} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Social</span>
                <span className="font-medium text-foreground">{socScore}</span>
              </div>
              <Progress value={socScore} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Governance</span>
                <span className="font-medium text-foreground">{govScore}</span>
              </div>
              <Progress value={govScore} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Factory className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{co2Saved.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">kg CO₂ Offset</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Droplets className="w-6 h-6 text-sky mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{waterSaved.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Liters Water</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{energySaved.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">kWh Energy</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{pickers?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Livelihoods</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Monthly Impact Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v} kg`} />
                <Bar dataKey="kg" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Material Mix</CardTitle></CardHeader>
          <CardContent>
            {!pieData.length ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} kg`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ESGAnalyticsPanel;
