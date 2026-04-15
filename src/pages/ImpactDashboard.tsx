import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { Download, Recycle, DollarSign, Leaf, Users, Heart, TrendingUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { motion } from "framer-motion";
import { addBrandedHeader, addDocMeta, addSectionTitle, drawTableHeader, drawTableRow, finalizePdf } from "@/lib/pdfBranding";
import { usePlatformStats } from "@/hooks/usePlatformStats";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(0,84%,60%)", "hsl(280,45%,50%)"];

const ImpactDashboard = () => {
  const navigate = useNavigate();
  const { derived } = usePlatformStats();

  const d = derived ?? {
    totalKg: 0, totalTons: 0, co2Avoided: 0, co2Tons: 0, waterSaved: 0,
    landfillReduced: 0, energySaved: 0, incomeGenerated: 0, paymentsKes: 0,
    totalCollections: 0, wastePickers: 0, aggregators: 0, recyclers: 0,
    totalJobs: 0, totalUsers: 0, totalProfiles: 1, womenCount: 0, youthCount: 0,
    womenRate: 0, youthRate: 0, collectionSites: 0, materials: [], monthlyTrend: [],
  };

  const estimatedIncome = d.paymentsKes || d.incomeGenerated;
  const materialData = d.materials.map((m) => ({ name: m.name, kg: Math.round(m.kg), co2: Math.round(m.co2) }));

  const monthlyTrend = (() => {
    const months: Record<string, { kg: number; co2: number; income: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - i);
      months[`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`] = { kg: 0, co2: 0, income: 0 };
    }
    d.monthlyTrend.forEach((m) => {
      if (months[m.month]) {
        months[m.month].kg = Math.round(m.kg);
        months[m.month].co2 = Math.round(m.co2);
      }
    });
    return Object.entries(months).map(([month, v]) => ({ month: month.slice(5), ...v }));
  })();

  const jobsData = [
    { name: "Waste Pickers", value: d.wastePickers },
    { name: "Aggregators", value: d.aggregators },
    { name: "Recyclers", value: d.recyclers },
  ].filter((x) => x.value > 0);

  const chartConfig = {
    kg: { label: "Kg Collected", color: "hsl(152,45%,22%)" },
    co2: { label: "CO₂ Avoided (kg)", color: "hsl(40,55%,55%)" },
    income: { label: "Income (KES)", color: "hsl(195,60%,50%)" },
    value: { label: "People", color: "hsl(152,45%,22%)" },
  };

  const exportReport = async () => {
    const doc = new jsPDF();
    let y = await addBrandedHeader(doc, "Impact Measurement Report", "Comprehensive platform impact analysis");
    y = addDocMeta(doc, [{ label: "Generated", value: new Date().toLocaleString() }], y);

    y = addSectionTitle(doc, "Key Impact Metrics", y);
    doc.setFontSize(10);
    [
      `Total Collected: ${d.totalTons.toFixed(1)} tonnes (${d.totalKg.toLocaleString()} kg)`,
      `Income Generated: KES ${estimatedIncome.toLocaleString()}`,
      `CO₂ Emissions Avoided: ${d.co2Tons.toFixed(2)} tonnes CO₂e`,
      `Jobs Created: ${d.totalJobs} (${d.wastePickers} pickers, ${d.aggregators} aggregators, ${d.recyclers} recyclers)`,
      `Women Participation: ${d.womenRate.toFixed(1)}% (${d.womenCount} participants)`,
      `Youth Participation (<35): ${d.youthRate.toFixed(1)}% (${d.youthCount} participants)`,
    ].forEach((m) => { doc.text(m, 20, y); y += 8; });
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

  const kpis = [
    { label: "Total Collected", value: `${d.totalTons.toFixed(1)}t`, sub: `${d.totalKg.toLocaleString()} kg`, icon: Recycle, color: "text-primary" },
    { label: "Income Generated", value: `KES ${(estimatedIncome / 1000).toFixed(0)}K`, sub: `${estimatedIncome.toLocaleString()} total`, icon: DollarSign, color: "text-secondary" },
    { label: "CO₂ Avoided", value: `${d.co2Tons.toFixed(1)}t`, sub: `${d.co2Avoided.toLocaleString()} kg CO₂e`, icon: Leaf, color: "text-primary" },
    { label: "Jobs Created", value: d.totalJobs, sub: `${d.wastePickers} pickers`, icon: Users, color: "text-foreground" },
    { label: "Women Rate", value: `${d.womenRate.toFixed(1)}%`, sub: `${d.womenCount} participants`, icon: Heart, color: "text-destructive" },
    { label: "Youth Rate", value: `${d.youthRate.toFixed(1)}%`, sub: `${d.youthCount} under 35`, icon: TrendingUp, color: "text-secondary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header — mobile responsive */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-sm sm:text-lg font-display font-bold text-foreground truncate">
                Impact Dashboard
              </h1>
            </div>
            <Button onClick={exportReport} size="sm" className="gap-1.5 shrink-0 text-xs sm:text-sm">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span> Report
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* KPI grid — 2 cols on mobile, scales up */}
        <motion.div {...fadeIn} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="hover:shadow-soft transition-shadow">
              <CardContent className="p-3 sm:p-5 text-center">
                <kpi.icon className={`w-5 h-5 sm:w-7 sm:h-7 mx-auto mb-1.5 sm:mb-2 ${kpi.color}`} />
                <p className="text-lg sm:text-2xl font-display font-bold text-foreground">{kpi.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">{kpi.label}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/60">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Monthly trend chart */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Monthly Impact Trend (12 months)</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px] w-full">
                <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={10} tick={{ fontSize: 9 }} />
                  <YAxis fontSize={10} tick={{ fontSize: 9 }} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="kg" stroke="hsl(152,45%,22%)" strokeWidth={2} name="Kg Collected" dot={false} />
                  <Line type="monotone" dataKey="co2" stroke="hsl(40,55%,55%)" strokeWidth={2} name="CO₂ Avoided" dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Material & Jobs charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
            <Card className="h-full overflow-hidden">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Impact by Material</CardTitle>
              </CardHeader>
              <CardContent className="px-1 sm:px-6">
                <ChartContainer config={chartConfig} className="h-[220px] sm:h-[280px] w-full">
                  <BarChart data={materialData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={8} angle={-30} textAnchor="end" height={55} tick={{ fontSize: 7 }} interval={0} />
                    <YAxis fontSize={9} tick={{ fontSize: 8 }} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="kg" fill="hsl(152,45%,22%)" radius={[4, 4, 0, 0]} name="Kg Collected" />
                    <Bar dataKey="co2" fill="hsl(40,55%,55%)" radius={[4, 4, 0, 0]} name="CO₂ Avoided" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
            <Card className="h-full overflow-hidden">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Livelihoods Supported</CardTitle>
              </CardHeader>
              <CardContent className="px-1 sm:px-6">
                {jobsData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[220px] sm:h-[280px] w-full">
                    <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <Pie data={jobsData} cx="50%" cy="50%" outerRadius={60} innerRadius={30} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={9}>
                        {jobsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[220px] sm:h-[280px] flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">No registered operators yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Methodology */}
        <motion.div {...fadeIn} transition={{ delay: 0.4 }}>
          <Card className="bg-muted/30">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-display font-semibold text-foreground mb-2 text-sm sm:text-base">📐 Calculation Methodology</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">CO₂ Emissions Avoided</p>
                  <p>Material-specific emission factors (IPCC/EPA baseline): PET 3.1, HDPE 2.8, Glass 0.6, Aluminium 9.1, Paper 1.1, Organic 0.5 kg CO₂e per kg recycled.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Income & Livelihoods</p>
                  <p>Income calculated from recorded M-Pesa payments and material price × quantity. Jobs counted as active registered waste pickers, aggregators, and recyclers.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Demographics</p>
                  <p>Women and youth (&lt;35 years) participation rates derived from self-reported profile data.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Data Integrity</p>
                  <p>All metrics sourced from batch-tracked, QR-verified collection records with geo-tagged timestamps.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default ImpactDashboard;
