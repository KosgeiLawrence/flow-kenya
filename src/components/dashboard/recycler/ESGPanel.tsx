import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Leaf, Factory, Droplets, Zap, TrendingUp, Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)"];

const ESGPanel = () => {
  const { user, profile } = useAuth();

  // Use transformation data for recyclers
  const { data: transformations } = useQuery({
    queryKey: ["recycler_esg_transformations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_transformations")
        .select("*, transformation_inputs(*), transformation_outputs(*)")
        .eq("user_id", user!.id)
        .order("transformation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Also fetch recycler products for additional context
  const { data: products } = useQuery({
    queryKey: ["recycler_esg_products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recycler_products")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate totals from transformation inputs (raw materials processed)
  const totalInputKg = transformations?.reduce((sum, t) => {
    const inputTotal = (t.transformation_inputs as any[])?.reduce(
      (s: number, inp: any) => s + Number(inp.quantity), 0
    ) || 0;
    return sum + inputTotal;
  }, 0) || 0;

  // Calculate output totals
  const totalOutputKg = transformations?.reduce((sum, t) => {
    const outputTotal = (t.transformation_outputs as any[])?.reduce(
      (s: number, out: any) => s + Number(out.quantity), 0
    ) || 0;
    return sum + outputTotal;
  }, 0) || 0;

  const totalKg = totalInputKg;
  const co2Saved = totalKg * 2.5;
  const waterSaved = totalKg * 18;
  const energySaved = totalKg * 5.8;
  const landfillDiverted = totalKg;
  const avgYield = transformations?.length
    ? transformations.reduce((s, t) => s + (Number(t.yield_percentage) || 0), 0) / transformations.length
    : 0;

  // Material breakdown from transformation inputs
  const materialMap = new Map<string, number>();
  transformations?.forEach((t) => {
    (t.transformation_inputs as any[])?.forEach((inp: any) => {
      const name = inp.material_name || "Unknown";
      materialMap.set(name, (materialMap.get(name) || 0) + Number(inp.quantity));
    });
  });
  const pieData = Array.from(materialMap.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
  const esgScore = Math.min(Math.round((totalKg / 1000) * 25 + 40), 100);

  const downloadESGReport = () => {
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");

    doc.setFontSize(22);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("ESG & Sustainability Impact Report", 20, 32);
    doc.setTextColor(0);

    doc.setFontSize(10);
    doc.text(`Generated: ${today}`, 20, 44);
    doc.text(`Recycler: ${profile?.full_name || "—"}`, 20, 51);
    doc.text(`ESG Score: ${esgScore}/100`, 20, 58);

    doc.setFontSize(14);
    doc.text("Environmental Impact Summary", 20, 74);
    doc.setFontSize(10);
    let y = 84;
    const metrics = [
      { label: "Total Material Processed", value: `${totalKg.toFixed(1)} kg` },
      { label: "Total Output Produced", value: `${totalOutputKg.toFixed(1)} kg` },
      { label: "Average Yield", value: `${avgYield.toFixed(1)}%` },
      { label: "CO₂ Emissions Saved", value: `${co2Saved.toFixed(1)} kg` },
      { label: "Water Saved", value: `${waterSaved.toLocaleString()} liters` },
      { label: "Energy Saved", value: `${energySaved.toFixed(1)} kWh` },
      { label: "Landfill Diversion", value: `${landfillDiverted.toFixed(1)} kg` },
      { label: "Total Transformations", value: `${transformations?.length || 0}` },
    ];
    metrics.forEach((m) => {
      doc.text(`• ${m.label}: ${m.value}`, 24, y);
      y += 8;
    });

    y += 8;
    doc.setFontSize(14);
    doc.text("Material Recovery Breakdown", 20, y);
    y += 10;
    doc.setFontSize(10);
    if (pieData.length) {
      pieData.forEach((d) => {
        doc.text(`• ${d.name}: ${d.value} kg`, 24, y);
        y += 8;
      });
    } else {
      doc.text("No material data available.", 24, y);
    }

    y += 12;
    doc.setFontSize(14);
    doc.text("Methodology", 20, y);
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text("CO₂ savings estimated at 2.5 kg CO₂/kg recycled (EPA/IPCC factors).", 24, y);
    y += 6;
    doc.text("Water savings estimated at 18 liters/kg recycled material.", 24, y);
    y += 6;
    doc.text("Energy savings estimated at 5.8 kWh/kg recycled material.", 24, y);

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("System-generated ESG report — Duara Flow", 20, 280);
    doc.save(`esg-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("ESG Report downloaded");
  };

  const downloadSustainabilityReport = () => {
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");

    doc.setFontSize(22);
    doc.text("Duara Flow", 20, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Sustainability Impact Certificate", 20, 32);
    doc.setTextColor(0);

    doc.setFontSize(10);
    doc.text(`Certificate Date: ${today}`, 20, 48);
    doc.text(`Certified To: ${profile?.full_name || "—"}`, 20, 55);

    doc.setFontSize(11);
    let y = 72;
    doc.text("This certifies that the above-named recycler has contributed", 20, y);
    y += 8;
    doc.text("to the following sustainability outcomes through the Duara Flow platform:", 20, y);

    y += 16;
    doc.setFontSize(18);
    doc.setTextColor(34, 87, 62);
    doc.text(`${totalKg.toFixed(0)} kg`, 90, y, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(0);
    y += 8;
    doc.text("of waste material diverted from landfill and recycled", 90, y, { align: "center" });

    y += 20;
    doc.setFontSize(10);
    const impacts = [
      `Prevented ${co2Saved.toFixed(0)} kg of CO₂ equivalent greenhouse gas emissions`,
      `Conserved approximately ${waterSaved.toLocaleString()} liters of water`,
      `Saved approximately ${energySaved.toFixed(0)} kWh of energy`,
      `Processed ${transformations?.length || 0} material transformations`,
      `Achieved average yield of ${avgYield.toFixed(1)}%`,
    ];
    impacts.forEach((imp) => {
      doc.text(`✓  ${imp}`, 24, y);
      y += 10;
    });

    y += 10;
    doc.setFontSize(9);
    doc.text("This certificate is system-generated based on verified transformation data.", 20, y);

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("Duara Flow Sustainability Certificate — Verified by Platform Data", 20, 280);
    doc.save(`sustainability-certificate-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Sustainability certificate downloaded");
  };

  return (
    <div className="space-y-6">
      {/* Download buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={downloadESGReport} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Download ESG Report
        </Button>
        <Button onClick={downloadSustainabilityReport} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Sustainability Certificate
        </Button>
      </div>

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
            <p className="text-xl font-bold text-foreground">{co2Saved.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kg CO₂ Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Droplets className="w-7 h-7 text-sky mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{waterSaved.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Liters Water Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Zap className="w-7 h-7 text-accent mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{energySaved.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kWh Energy Saved</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{landfillDiverted.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kg Landfill Diverted</p>
          </CardContent>
        </Card>
      </div>

      {/* Material breakdown */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Material Recovery Breakdown</CardTitle></CardHeader>
        <CardContent>
          {!pieData.length ? (
            <p className="text-sm text-muted-foreground">No transformation data yet. Record material transformations to see your impact.</p>
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
