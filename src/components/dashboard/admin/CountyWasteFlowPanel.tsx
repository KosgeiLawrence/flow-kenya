import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { MapPin, Package, Recycle, TrendingUp, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { addBrandedHeader, addDocMeta, addSectionTitle, drawTableHeader, drawTableRow, finalizePdf } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)", "hsl(280,50%,50%)"];

const CountyWasteFlowPanel = () => {
  const { t } = useTranslation();
  const { data: collections } = useQuery({ queryKey: ["admin-county-waste-flow"], queryFn: async () => { const { data, error } = await supabase.from("collections").select("*, material_types(name)").order("collected_at", { ascending: false }); if (error) throw error; return data; } });
  const { data: payments } = useQuery({ queryKey: ["admin-county-payments"], queryFn: async () => { const { data, error } = await supabase.from("payments").select("*"); if (error) throw error; return data; } });

  const totalWeight = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const totalPayments = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;

  const locationMap: Record<string, { kg: number; count: number }> = {};
  collections?.forEach((c) => { const loc = c.location_name || "Unknown"; if (!locationMap[loc]) locationMap[loc] = { kg: 0, count: 0 }; locationMap[loc].kg += Number(c.quantity); locationMap[loc].count += 1; });
  const locationData = Object.entries(locationMap).map(([name, d]) => ({ name, kg: Math.round(d.kg), count: d.count })).sort((a, b) => b.kg - a.kg).slice(0, 15);

  const materialMap: Record<string, number> = {};
  collections?.forEach((c) => { const name = (c as any).material_types?.name || "Unknown"; materialMap[name] = (materialMap[name] || 0) + Number(c.quantity); });
  const materialData = Object.entries(materialMap).map(([name, value]) => ({ name, value: Math.round(value) }));

  const chartConfig = { kg: { label: "Kg", color: "hsl(152,45%,22%)" }, value: { label: "Kg", color: "hsl(40,55%,55%)" } };

  const exportCountyReport = async () => {
    const doc = new jsPDF();
    let y = await addBrandedHeader(doc, "County-Level Waste Flow Report", "Platform-wide waste collection by location and material");
    y = addDocMeta(doc, [
      { label: "Generated", value: new Date().toLocaleString() },
      { label: "Total Weight", value: `${(totalWeight / 1000).toFixed(2)} tons` },
      { label: "Collections", value: `${collections?.length || 0}` },
      { label: "Total Payments", value: `KES ${totalPayments.toLocaleString()}` },
      { label: "Zones", value: `${Object.keys(locationMap).length}` },
    ], y);

    y = addSectionTitle(doc, "Zone Breakdown", y);
    y = drawTableHeader(doc, [{ label: "Zone", x: 17 }, { label: "Kg", x: 110 }, { label: "Collections", x: 145 }], y, 180);
    locationData.forEach((l, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(l.name.slice(0, 40), 17, y); doc.text(`${l.kg.toLocaleString()}`, 110, y); doc.text(`${l.count}`, 145, y);
      y += 5;
    });

    y += 8;
    y = addSectionTitle(doc, "Material Breakdown", y);
    doc.setFontSize(9);
    materialData.forEach((m) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(`${m.name}: ${m.value.toLocaleString()} kg (${totalWeight > 0 ? ((m.value / totalWeight) * 100).toFixed(1) : 0}%)`, 20, y);
      y += 6;
    });

    await finalizePdf(doc);
    doc.save("county-waste-flow-report.pdf");
    toast.success("County waste flow report downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-display font-bold text-foreground">County-Level Waste Flow</h2><p className="text-muted-foreground">Platform-wide waste collection by location and material</p></div>
        <Button onClick={exportCountyReport} className="gap-2"><Download className="w-4 h-4" /> Export Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ label: "Total Collected", value: `${(totalWeight / 1000).toFixed(1)} tons`, icon: Package }, { label: "Collection Zones", value: Object.keys(locationMap).length, icon: MapPin }, { label: "Material Types", value: Object.keys(materialMap).length, icon: Recycle }, { label: "Total Payments", value: `KES ${Math.round(totalPayments / 1000)}K`, icon: TrendingUp }].map((s) => (<Card key={s.label}><CardContent className="overflow-hidden p-4 flex items-center gap-3"><s.icon className="overflow-hidden w-8 h-8 text-primary" /><div><p className="overflow-hidden text-xl font-bold text-foreground">{s.value}</p><p className="overflow-hidden text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden"><CardHeader><CardTitle className="text-base">Collection by Zone</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px]"><BarChart data={locationData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={10} /><YAxis dataKey="name" type="category" fontSize={10} width={80} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="kg" fill="hsl(152,45%,22%)" radius={[0, 4, 4, 0]} /></BarChart></ChartContainer></CardContent></Card>
        <Card className="overflow-hidden"><CardHeader><CardTitle className="text-base">Material Composition</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px]"><PieChart><Pie data={materialData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}kg`}>{materialData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Zone Performance Table</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Zone</TableHead><TableHead>Total Collected (kg)</TableHead><TableHead>Collections</TableHead><TableHead>% of Total</TableHead></TableRow></TableHeader><TableBody>{locationData.map((l) => (<TableRow key={l.name}><TableCell className="font-medium">{l.name}</TableCell><TableCell>{l.kg.toLocaleString()} kg</TableCell><TableCell>{l.count}</TableCell><TableCell className="text-muted-foreground">{totalWeight > 0 ? ((l.kg / totalWeight) * 100).toFixed(1) : 0}%</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
    </div>
  );
};

export default CountyWasteFlowPanel;
