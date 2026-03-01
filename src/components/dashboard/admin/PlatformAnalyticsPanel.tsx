import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Package, Users, DollarSign, Recycle } from "lucide-react";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)"];

const PlatformAnalyticsPanel = () => {
  const { data: collections } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*, material_types(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-roles-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-payments-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalWeight = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const totalPayments = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;

  // Role distribution
  const roleCounts = roles?.reduce((acc, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const roleData = Object.entries(roleCounts).map(([name, value]) => ({ name: name.replace("_", " "), value }));

  // Daily collections (last 14 days)
  const dailyData = (() => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split("T")[0]] = 0;
    }
    collections?.forEach((c) => {
      const day = c.collected_at.split("T")[0];
      if (days[day] !== undefined) days[day] += Number(c.quantity);
    });
    return Object.entries(days).map(([date, kg]) => ({ date: date.slice(5), kg: Math.round(kg) }));
  })();

  // Material breakdown
  const materialBreakdown = (() => {
    const map: Record<string, number> = {};
    collections?.forEach((c) => {
      const name = (c as any).material_types?.name || "Unknown";
      map[name] = (map[name] || 0) + Number(c.quantity);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  })();

  const chartConfig = { kg: { label: "Kg Collected", color: "hsl(152,45%,22%)" } };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Platform-Wide Analytics</h2>
        <p className="text-muted-foreground">Overview of all platform activity and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: profiles?.length || 0, icon: Users, suffix: "" },
          { label: "Total Collections", value: collections?.length || 0, icon: Package, suffix: "" },
          { label: "Weight Collected", value: `${(totalWeight / 1000).toFixed(1)}`, icon: Recycle, suffix: " tons" },
          { label: "Total Payments", value: `KES ${totalPayments.toLocaleString()}`, icon: DollarSign, suffix: "" },
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
          <CardHeader><CardTitle className="text-base">Daily Collections (14 days)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={dailyData}>
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
