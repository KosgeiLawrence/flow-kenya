import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, Recycle, DollarSign, Leaf, Users, Heart, TrendingUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { motion } from "framer-motion";
import { addBrandedHeader, addDocMeta, addSectionTitle, drawTableHeader, drawTableRow, finalizePdf } from "@/lib/pdfBranding";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)", "hsl(280,45%,50%)"];
const CO2_FACTORS: Record<string, number> = { "PET Plastic": 3.1, "HDPE Plastic": 2.8, "Glass": 0.6, "Aluminium": 9.1, "Paper/Cardboard": 1.1, "Organic Waste": 0.5 };
const DEFAULT_CO2_FACTOR = 2.5;

const ImpactDashboard = () => {
  const navigate = useNavigate();

  const { data: collections } = useQuery({ queryKey: ["impact-collections"], queryFn: async () => { const { data, error } = await supabase.from("collections").select("*, material_types(name, price_per_unit)"); if (error) throw error; return data; } });
  const { data: payments } = useQuery({ queryKey: ["impact-payments"], queryFn: async () => { const { data, error } = await supabase.from("payments").select("*").eq("status", "completed"); if (error) throw error; return data; } });
  const { data: profiles } = useQuery({ queryKey: ["impact-profiles"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*"); if (error) throw error; return data; } });
  const { data: roles } = useQuery({ queryKey: ["impact-roles"], queryFn: async () => { const { data, error } = await supabase.from("user_roles").select("*"); if (error) throw error; return data; } });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const totalTons = totalKg / 1000;
  const incomeFromPayments = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const estimatedIncome = incomeFromPayments || collections?.reduce((s, c) => s + Number(c.quantity) * Number((c as any).material_types?.price_per_unit || 0), 0) || 0;
  const co2Avoided = collections?.reduce((s, c) => { const name = (c as any).material_types?.name || ""; return s + Number(c.quantity) * (CO2_FACTORS[name] || DEFAULT_CO2_FACTOR); }, 0) || 0;
  const wastePickers = roles?.filter((r) => r.role === "waste_picker").length || 0;
  const aggregators = roles?.filter((r) => r.role === "aggregator").length || 0;
  const recyclers = roles?.filter((r) => r.role === "recycler").length || 0;
  const totalJobs = wastePickers + aggregators + recyclers;
  const womenCount = profiles?.filter((p) => (p as any).gender === "female").length || 0;
  const youthCount = profiles?.filter((p) => { const dob = (p as any).date_of_birth; if (!dob) return false; return (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000) < 35; }).length || 0;
  const totalProfiles = profiles?.length || 1;
  const womenRate = ((womenCount / totalProfiles) * 100).toFixed(1);
  const youthRate = ((youthCount / totalProfiles) * 100).toFixed(1);

  const materialMap: Record<string, { kg: number; co2: number }> = {};
  collections?.forEach((c) => { const name = (c as any).material_types?.name || "Other"; const qty = Number(c.quantity); const factor = CO2_FACTORS[name] || DEFAULT_CO2_FACTOR; if (!materialMap[name]) materialMap[name] = { kg: 0, co2: 0 }; materialMap[name].kg += qty; materialMap[name].co2 += qty * factor; });
  const materialData = Object.entries(materialMap).map(([name, v]) => ({ name, kg: Math.round(v.kg), co2: Math.round(v.co2) }));

  const monthlyTrend = (() => {
    const months: Record<string, { kg: number; income: number; co2: number }> = {};
    for (let i = 11; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = { kg: 0, income: 0, co2: 0 }; }
    collections?.forEach((c) => { const key = c.collected_at.slice(0, 7); if (months[key]) { const qty = Number(c.quantity); months[key].kg += qty; months[key].co2 += qty * (CO2_FACTORS[(c as any).material_types?.name || ""] || DEFAULT_CO2_FACTOR); months[key].income += qty * Number((c as any).material_types?.price_per_unit || 0); } });
    return Object.entries(months).map(([month, v]) => ({ month: month.slice(5), kg: Math.round(v.kg), co2: Math.round(v.co2), income: Math.round(v.income) }));
  })();

  const jobsData = [{ name: "Waste Pickers", value: wastePickers }, { name: "Aggregators", value: aggregators }, { name: "Recyclers", value: recyclers }].filter((d) => d.value > 0);
  const chartConfig = { kg: { label: "Kg Collected", color: "hsl(152,45%,22%)" }, co2: { label: "CO₂ Avoided (kg)", color: "hsl(40,55%,55%)" }, income: { label: "Income (KES)", color: "hsl(195,60%,50%)" }, value: { label: "People", color: "hsl(152,45%,22%)" } };

  const exportReport = async () => {
    const doc = new jsPDF();
    let y = await addBrandedHeader(doc, "Impact Measurement Report", "Comprehensive platform impact analysis");
    y = addDocMeta(doc, [{ label: "Generated", value: new Date().toLocaleString() }], y);

    y = addSectionTitle(doc, "Key Impact Metrics", y);
    doc.setFontSize(10);
    [`Total Collected: ${totalTons.toFixed(1)} tonnes (${totalKg.toLocaleString()} kg)`, `Income Generated: KES ${estimatedIncome.toLocaleString()}`, `CO₂ Emissions Avoided: ${(co2Avoided / 1000).toFixed(2)} tonnes CO₂e`, `Jobs Created: ${totalJobs} (${wastePickers} pickers, ${aggregators} aggregators, ${recyclers} recyclers)`, `Women Participation: ${womenRate}% (${womenCount} participants)`, `Youth Participation (<35): ${youthRate}% (${youthCount} participants)`]
      .forEach((m) => { doc.text(m, 20, y); y += 8; });
    y += 6;

    y = addSectionTitle(doc, "Material Breakdown", y);
    y = drawTableHeader(doc, [{ label: "Material", x: 17 }, { label: "Kg Collected", x: 80 }, { label: "CO₂ Avoided (kg)", x: 130 }], y, 180);
    materialData.forEach((m, i) => {
      drawTableRow(doc, y, i, 180);
      doc.setFontSize(8);
      doc.text(m.name, 17, y); doc.text(m.kg.toLocaleString(), 80, y); doc.text(m.co2.toLocaleString(), 130, y);
      y += 7;
    });

    y += 8;
    doc.setFontSize(8);
    doc.text("Methodology: CO₂ calculations use material-specific emission factors (IPCC/EPA baseline).", 15, y); y += 5;
    doc.text("Income estimates derived from recorded payments and material price × quantity collected.", 15, y);

    await finalizePdf(doc);
    doc.save("impact-measurement-report.pdf");
  };

  const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <h1 className="text-lg font-display font-bold text-foreground">Impact Measurement Framework</h1>
          </div>
          <Button onClick={exportReport} className="gap-2"><Download className="w-4 h-4" /> Download Report</Button>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        <motion.div {...fadeIn} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[{ label: "Total Collected", value: `${totalTons.toFixed(1)}t`, sub: `${totalKg.toLocaleString()} kg`, icon: Recycle, color: "text-primary" }, { label: "Income Generated", value: `KES ${(estimatedIncome / 1000).toFixed(0)}K`, sub: `${estimatedIncome.toLocaleString()} total`, icon: DollarSign, color: "text-secondary" }, { label: "CO₂ Avoided", value: `${(co2Avoided / 1000).toFixed(1)}t`, sub: `${co2Avoided.toLocaleString()} kg CO₂e`, icon: Leaf, color: "text-primary" }, { label: "Jobs Created", value: totalJobs, sub: `${wastePickers} pickers`, icon: Users, color: "text-foreground" }, { label: "Women Rate", value: `${womenRate}%`, sub: `${womenCount} participants`, icon: Heart, color: "text-destructive" }, { label: "Youth Rate", value: `${youthRate}%`, sub: `${youthCount} under 35`, icon: TrendingUp, color: "text-secondary" }].map((kpi) => (
            <Card key={kpi.label} className="hover:shadow-soft transition-shadow"><CardContent className="p-5 text-center"><kpi.icon className={`w-7 h-7 mx-auto mb-2 ${kpi.color}`} /><p className="text-2xl font-display font-bold text-foreground">{kpi.value}</p><p className="text-xs text-muted-foreground mt-1">{kpi.label}</p><p className="text-[10px] text-muted-foreground/60">{kpi.sub}</p></CardContent></Card>
          ))}
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.1 }}><Card><CardHeader><CardTitle className="text-base">Monthly Impact Trend (12 months)</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[300px]"><LineChart data={monthlyTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="kg" stroke="hsl(152,45%,22%)" strokeWidth={2} name="Kg Collected" /><Line type="monotone" dataKey="co2" stroke="hsl(40,55%,55%)" strokeWidth={2} name="CO₂ Avoided" /></LineChart></ChartContainer></CardContent></Card></motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div {...fadeIn} transition={{ delay: 0.2 }}><Card className="h-full"><CardHeader><CardTitle className="text-base">Impact by Material</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[280px]"><BarChart data={materialData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} /><YAxis fontSize={11} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="kg" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} name="Kg Collected" /><Bar dataKey="co2" fill="hsl(40,55%,55%)" radius={[4, 4, 0, 0]} name="CO₂ Avoided" /></BarChart></ChartContainer></CardContent></Card></motion.div>
          <motion.div {...fadeIn} transition={{ delay: 0.3 }}><Card className="h-full"><CardHeader><CardTitle className="text-base">Livelihoods Supported</CardTitle></CardHeader><CardContent>{jobsData.length > 0 ? (<ChartContainer config={chartConfig} className="h-[280px]"><PieChart><Pie data={jobsData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{jobsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer>) : (<div className="h-[280px] flex items-center justify-center"><p className="text-muted-foreground text-sm">No registered operators yet</p></div>)}</CardContent></Card></motion.div>
        </div>

        <motion.div {...fadeIn} transition={{ delay: 0.4 }}><Card className="bg-muted/30"><CardContent className="p-6"><h3 className="font-display font-semibold text-foreground mb-2">📐 Calculation Methodology</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground"><div><p className="font-medium text-foreground mb-1">CO₂ Emissions Avoided</p><p>Material-specific emission factors (IPCC/EPA baseline): PET 3.1, HDPE 2.8, Glass 0.6, Aluminium 9.1, Paper 1.1, Organic 0.5 kg CO₂e per kg recycled.</p></div><div><p className="font-medium text-foreground mb-1">Income & Livelihoods</p><p>Income calculated from recorded M-Pesa payments and material price × quantity. Jobs counted as active registered waste pickers, aggregators, and recyclers.</p></div><div><p className="font-medium text-foreground mb-1">Demographics</p><p>Women and youth (&lt;35 years) participation rates derived from self-reported profile data.</p></div><div><p className="font-medium text-foreground mb-1">Data Integrity</p><p>All metrics sourced from batch-tracked, QR-verified collection records with geo-tagged timestamps.</p></div></div></CardContent></Card></motion.div>
      </main>
    </div>
  );
};

export default ImpactDashboard;
