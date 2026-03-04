import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Package, Users, DollarSign, Recycle } from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)"];

const PlatformAnalyticsPanel = () => {
  const { derived, stats } = usePlatformStats();

  const d = derived ?? {
    totalKg: 0, totalTons: 0, totalCollections: 0, paymentsKes: 0,
    totalUsers: 0, wastePickers: 0, aggregators: 0, recyclers: 0,
    materials: [], monthlyTrend: [],
  };

  // Role distribution from centralized stats
  const roleData = [
    { name: "waste picker", value: Number(stats?.total_waste_pickers) || 0 },
    { name: "aggregator", value: Number(stats?.total_aggregators) || 0 },
    { name: "recycler", value: Number(stats?.total_recyclers) || 0 },
    { name: "ngo", value: Number(stats?.total_ngos) || 0 },
    { name: "corporate", value: Number(stats?.total_corporates) || 0 },
    { name: "county gov", value: Number(stats?.total_county_gov) || 0 },
  ].filter((r) => r.value > 0);

  // Monthly trend for chart (last 12 months)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - i);
      months[`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`] = 0;
    }
    d.monthlyTrend.forEach((m) => {
      if (months[m.month] !== undefined) months[m.month] = Math.round(m.kg);
    });
    return Object.entries(months).map(([date, kg]) => ({ date: date.slice(5), kg }));
  })();

  const materialBreakdown = d.materials.map((m) => ({ name: m.name, value: Math.round(m.kg) }));
  const chartConfig = { kg: { label: "Kg Collected", color: "hsl(152,45%,22%)" } };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Platform-Wide Analytics</h2>
        <p className="text-muted-foreground">Overview of all platform activity and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: d.totalUsers, icon: Users, suffix: "" },
          { label: "Total Collections", value: d.totalCollections, icon: Package, suffix: "" },
          { label: "Weight Collected", value: `${d.totalTons.toFixed(1)}`, icon: Recycle, suffix: " tons" },
          { label: "Total Payments", value: `KES ${d.paymentsKes.toLocaleString()}`, icon: DollarSign, suffix: "" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}{s.suffix}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Collections (12 months)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="kg" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">User Roles Distribution</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Material Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={materialBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis dataKey="name" type="category" fontSize={11} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(40,55%,55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlatformAnalyticsPanel;
