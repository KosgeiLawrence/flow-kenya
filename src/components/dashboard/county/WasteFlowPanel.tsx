import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { MapPin, Package, Recycle, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)"];

const WasteFlowPanel = () => {
  const { t } = useTranslation();
  const { data: collections } = useQuery({
    queryKey: ["county-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*, material_types(name)").order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalWeight = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;

  // By location
  const locationMap: Record<string, number> = {};
  collections?.forEach((c) => {
    const loc = c.location_name || "Unknown";
    locationMap[loc] = (locationMap[loc] || 0) + Number(c.quantity);
  });
  const locationData = Object.entries(locationMap)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // By material
  const materialMap: Record<string, number> = {};
  collections?.forEach((c) => {
    const name = (c as any).material_types?.name || "Unknown";
    materialMap[name] = (materialMap[name] || 0) + Number(c.quantity);
  });
  const materialData = Object.entries(materialMap).map(([name, value]) => ({ name, value: Math.round(value) }));

  // Daily trend
  const dailyData = (() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
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

  const chartConfig = { kg: { label: "Kg", color: "hsl(152,45%,22%)" }, value: { label: "Kg", color: "hsl(40,55%,55%)" } };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">County Waste Flow Dashboard</h2>
        <p className="text-muted-foreground">Real-time waste collection and flow monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Collected", value: `${(totalWeight / 1000).toFixed(1)} tons`, icon: Package },
          { label: "Collection Points", value: Object.keys(locationMap).length, icon: MapPin },
          { label: "Material Types", value: Object.keys(materialMap).length, icon: Recycle },
          { label: "Active Days", value: dailyData.filter((d) => d.kg > 0).length, icon: TrendingUp },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="text-base">Daily Collections (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px]">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="kg" fill="hsl(152,45%,22%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="text-base">Material Composition</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px]">
              <PieChart>
                <Pie data={materialData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}kg`}>
                  {materialData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top Collection Zones</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Total Collected (kg)</TableHead>
                <TableHead>% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locationData.map((l) => (
                <TableRow key={l.name}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.value.toLocaleString()} kg</TableCell>
                  <TableCell className="text-muted-foreground">{totalWeight > 0 ? ((l.value / totalWeight) * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WasteFlowPanel;
