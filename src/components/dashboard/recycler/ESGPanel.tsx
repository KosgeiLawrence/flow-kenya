import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Leaf, Factory, Droplets, Zap, TrendingUp, Download, CalendarIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ["hsl(152,45%,22%)", "hsl(40,55%,55%)", "hsl(195,60%,50%)", "hsl(25,30%,35%)", "hsl(340,50%,50%)"];

type PeriodOption = "7d" | "30d" | "90d" | "6m" | "1y" | "all" | "custom";

const ESGPanel = () => {
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState<PeriodOption>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "7d": return { from: subDays(now, 7), to: now };
      case "30d": return { from: subDays(now, 30), to: now };
      case "90d": return { from: subDays(now, 90), to: now };
      case "6m": return { from: subMonths(now, 6), to: now };
      case "1y": return { from: subYears(now, 1), to: now };
      case "custom": return { from: customFrom || subYears(now, 5), to: customTo || now };
      default: return null; // all
    }
  }, [period, customFrom, customTo]);

  // Transformation data
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

  // Cleanup exercises data
  const { data: cleanups } = useQuery({
    queryKey: ["recycler_esg_cleanups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cleanup_exercises")
        .select("*")
        .eq("user_id", user!.id)
        .order("cleanup_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Filter by date range
  const filteredTransformations = useMemo(() => {
    if (!transformations) return [];
    if (!dateRange) return transformations;
    return transformations.filter((t) => {
      const d = new Date(t.transformation_date);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    });
  }, [transformations, dateRange]);

  const filteredCleanups = useMemo(() => {
    if (!cleanups) return [];
    if (!dateRange) return cleanups;
    return cleanups.filter((c) => {
      const d = new Date(c.cleanup_date);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    });
  }, [cleanups, dateRange]);

  // Transformation metrics
  const transformationInputKg = filteredTransformations.reduce((sum, t) => {
    return sum + ((t.transformation_inputs as any[])?.reduce((s: number, inp: any) => s + Number(inp.quantity), 0) || 0);
  }, 0);

  const transformationOutputKg = filteredTransformations.reduce((sum, t) => {
    return sum + ((t.transformation_outputs as any[])?.reduce((s: number, out: any) => s + Number(out.quantity), 0) || 0);
  }, 0);

  // Cleanup metrics
  const cleanupWasteKg = filteredCleanups.reduce((s, c) => s + Number(c.total_waste_kg || 0), 0);
  const cleanupRecyclableKg = filteredCleanups.reduce((s, c) => s + Number(c.recyclable_waste_kg || 0), 0);
  const cleanupVolunteers = filteredCleanups.reduce((s, c) => s + Number(c.num_volunteers || 0), 0);

  // Combined totals
  const totalKg = transformationInputKg + cleanupWasteKg;
  const co2Saved = totalKg * 2.5;
  const waterSaved = totalKg * 18;
  const energySaved = totalKg * 5.8;
  const landfillDiverted = totalKg;
  const avgYield = filteredTransformations.length
    ? filteredTransformations.reduce((s, t) => s + (Number(t.yield_percentage) || 0), 0) / filteredTransformations.length
    : 0;

  // Material breakdown from transformations
  const materialMap = new Map<string, number>();
  filteredTransformations.forEach((t) => {
    (t.transformation_inputs as any[])?.forEach((inp: any) => {
      const name = inp.material_name || "Unknown";
      materialMap.set(name, (materialMap.get(name) || 0) + Number(inp.quantity));
    });
  });
  // Add cleanup material breakdown
  filteredCleanups.forEach((c) => {
    if (Number(c.pet_bottles_kg) > 0) materialMap.set("PET Bottles", (materialMap.get("PET Bottles") || 0) + Number(c.pet_bottles_kg));
    if (Number(c.hdpe_kg) > 0) materialMap.set("HDPE", (materialMap.get("HDPE") || 0) + Number(c.hdpe_kg));
    if (Number(c.glass_kg) > 0) materialMap.set("Glass", (materialMap.get("Glass") || 0) + Number(c.glass_kg));
    if (Number(c.metal_kg) > 0) materialMap.set("Metal", (materialMap.get("Metal") || 0) + Number(c.metal_kg));
    if (Number(c.sachets_kg) > 0) materialMap.set("Sachets", (materialMap.get("Sachets") || 0) + Number(c.sachets_kg));
    if (Number(c.fishing_nets_kg) > 0) materialMap.set("Fishing Nets", (materialMap.get("Fishing Nets") || 0) + Number(c.fishing_nets_kg));
    if (Number(c.other_materials_kg) > 0) materialMap.set("Other", (materialMap.get("Other") || 0) + Number(c.other_materials_kg));
  });
  const pieData = Array.from(materialMap.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
  const esgScore = Math.min(Math.round((totalKg / 1000) * 25 + 40), 100);

  const periodLabel = () => {
    if (!dateRange) return "All Time";
    return `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`;
  };

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
    doc.text(`Period: ${periodLabel()}`, 20, 51);
    doc.text(`Recycler: ${profile?.full_name || "—"}`, 20, 58);
    doc.text(`ESG Score: ${esgScore}/100`, 20, 65);

    doc.setFontSize(14);
    doc.text("Environmental Impact Summary", 20, 80);
    doc.setFontSize(10);
    let y = 90;
    const metrics = [
      { label: "Total Material Processed (Transformations)", value: `${transformationInputKg.toFixed(1)} kg` },
      { label: "Total Output Produced", value: `${transformationOutputKg.toFixed(1)} kg` },
      { label: "Average Yield", value: `${avgYield.toFixed(1)}%` },
      { label: "Cleanup Waste Collected", value: `${cleanupWasteKg.toFixed(1)} kg` },
      { label: "Cleanup Recyclable Waste", value: `${cleanupRecyclableKg.toFixed(1)} kg` },
      { label: "Cleanup Exercises", value: `${filteredCleanups.length}` },
      { label: "Volunteers Engaged", value: `${cleanupVolunteers}` },
      { label: "CO₂ Emissions Saved", value: `${co2Saved.toFixed(1)} kg` },
      { label: "Water Saved", value: `${waterSaved.toLocaleString()} liters` },
      { label: "Energy Saved", value: `${energySaved.toFixed(1)} kWh` },
      { label: "Landfill Diversion", value: `${landfillDiverted.toFixed(1)} kg` },
    ];
    metrics.forEach((m) => {
      doc.text(`• ${m.label}: ${m.value}`, 24, y);
      y += 7;
    });

    y += 6;
    doc.setFontSize(14);
    doc.text("Material Recovery Breakdown", 20, y);
    y += 10;
    doc.setFontSize(10);
    if (pieData.length) {
      pieData.forEach((d) => { doc.text(`• ${d.name}: ${d.value} kg`, 24, y); y += 7; });
    } else {
      doc.text("No material data available.", 24, y);
    }

    y += 10;
    doc.setFontSize(14);
    doc.text("Methodology", 20, y);
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text("CO₂ savings estimated at 2.5 kg CO₂/kg recycled (EPA/IPCC factors).", 24, y); y += 6;
    doc.text("Water savings estimated at 18 liters/kg recycled material.", 24, y); y += 6;
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
    doc.text(`Period: ${periodLabel()}`, 20, 55);
    doc.text(`Certified To: ${profile?.full_name || "—"}`, 20, 62);

    doc.setFontSize(11);
    let y = 78;
    doc.text("This certifies that the above-named recycler has contributed", 20, y); y += 8;
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
    const impacts = [
      `Prevented ${co2Saved.toFixed(0)} kg of CO₂ equivalent greenhouse gas emissions`,
      `Conserved approximately ${waterSaved.toLocaleString()} liters of water`,
      `Saved approximately ${energySaved.toFixed(0)} kWh of energy`,
      `Processed ${filteredTransformations.length} material transformations`,
      `Conducted ${filteredCleanups.length} cleanup exercises with ${cleanupVolunteers} volunteers`,
      `Achieved average yield of ${avgYield.toFixed(1)}%`,
    ];
    impacts.forEach((imp) => { doc.text(`✓  ${imp}`, 24, y); y += 10; });

    y += 10;
    doc.setFontSize(9);
    doc.text("This certificate is system-generated based on verified platform data.", 20, y);

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("Duara Flow Sustainability Certificate — Verified by Platform Data", 20, 280);
    doc.save(`sustainability-certificate-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Sustainability certificate downloaded");
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">Report Period:</span>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last 1 Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {period === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left text-xs", !customFrom && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {customFrom ? format(customFrom, "MMM d, yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left text-xs", !customTo && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {customTo ? format(customTo, "MMM d, yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          {dateRange && <p className="text-xs text-muted-foreground mt-2">{periodLabel()}</p>}
        </CardContent>
      </Card>

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
              <p className="text-xs text-muted-foreground">Based on recycling volume, cleanups, and environmental impact</p>
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

      {/* Cleanup summary */}
      {filteredCleanups.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Cleanup Exercises Impact</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{filteredCleanups.length}</p>
                <p className="text-xs text-muted-foreground">Cleanups</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cleanupWasteKg.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">kg Collected</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cleanupRecyclableKg.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">kg Recyclable</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cleanupVolunteers}</p>
                <p className="text-xs text-muted-foreground">Volunteers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material breakdown */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Material Recovery Breakdown</CardTitle></CardHeader>
        <CardContent>
          {!pieData.length ? (
            <p className="text-sm text-muted-foreground">No data yet for the selected period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}kg`}>
                  {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
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
