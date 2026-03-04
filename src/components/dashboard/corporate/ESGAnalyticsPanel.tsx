import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Leaf, Factory, Droplets, Zap, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { usePlatformStats } from "@/hooks/usePlatformStats";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)"];

const ESGAnalyticsPanel = () => {
  const { derived } = usePlatformStats();

  const d = derived ?? {
    totalKg: 0, co2Avoided: 0, waterSaved: 0, energySaved: 0,
    wastePickers: 0, materials: [], monthlyTrend: [],
  };

  // ESG pillars
  const envScore = Math.min(Math.round((d.totalKg / 5000) * 50 + 30), 100);
  const socScore = Math.min(Math.round((d.wastePickers / 50) * 40 + 40), 100);
  const govScore = 75;
  const overallESG = Math.round((envScore + socScore + govScore) / 3);

  const monthlyData = (() => {
    const months: Record<string, { kg: number; co2: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - i);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { kg: 0, co2: 0 };
    }
    d.monthlyTrend.forEach((m) => {
      if (months[m.month]) {
        months[m.month] = { kg: Math.round(m.kg), co2: Math.round(m.co2) };
      }
    });
    return Object.entries(months).map(([month, v]) => ({ month: month.slice(5), ...v }));
  })();

  const pieData = d.materials.map((m) => ({ name: m.name, value: Math.round(m.kg) }));

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
            {[
              { label: "Environmental", value: envScore },
              { label: "Social", value: socScore },
              { label: "Governance", value: govScore },
            ].map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-medium text-foreground">{p.value}</span>
                </div>
                <Progress value={p.value} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Factory className="w-6 h-6 text-primary mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{d.co2Avoided.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">kg CO₂ Offset</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Droplets className="w-6 h-6 text-sky mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{d.waterSaved.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Liters Water</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Zap className="w-6 h-6 text-accent mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{d.energySaved.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">kWh Energy</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-primary mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{d.wastePickers}</p><p className="text-[10px] text-muted-foreground">Livelihoods</p></CardContent></Card>
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
