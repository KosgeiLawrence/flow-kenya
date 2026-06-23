import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Award } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { loadImageAsBase64 } from "@/lib/pdfLogoUtils";
import { addBrandedHeader, addDocMeta, finalizePdf, PDF_COLORS } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

const ImpactCertificatesPanel = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const { data: collections } = useQuery({ queryKey: ["corp_cert_collections"], queryFn: async () => { const { data, error } = await supabase.from("collections").select("*, material_types(name, unit)").order("collected_at", { ascending: false }); if (error) throw error; return data; } });
  const { data: org } = useQuery({ queryKey: ["corp_org", profile?.organization_id], enabled: !!profile?.organization_id, queryFn: async () => { const { data, error } = await supabase.from("organizations").select("name, logo_url").eq("id", profile!.organization_id!).single(); if (error) throw error; return data; } });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const co2Saved = (totalKg * 2.5).toFixed(1);
  const certId = `CERT-${(profile?.id || "").slice(0, 8).toUpperCase()}-${format(new Date(), "yyyyMM")}`;
  const verifyUrl = `https://duaraflow.com/verify/${certId}`;

  const downloadCertificate = async () => {
    const doc = new jsPDF();
    const orgLogo = org?.logo_url ? await loadImageAsBase64(org.logo_url) : null;

    // Double border
    doc.setDrawColor(...PDF_COLORS.forest);
    doc.setLineWidth(2);
    doc.rect(10, 10, 190, 277);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, 182, 269);

    let y = await addBrandedHeader(doc, "Impact Certificate", "Verified Environmental Impact", { orgLogoBase64: orgLogo });

    y += 4;
    doc.setFontSize(11);
    doc.text("This certifies that", 105, y, { align: "center" });
    y += 14;

    // Wrap long org names so they never bleed past the certificate borders.
    doc.setFontSize(18);
    doc.setTextColor(...PDF_COLORS.forest);
    const orgDisplayName = org?.name || profile?.full_name || "Corporate Entity";
    const nameLines = doc.splitTextToSize(orgDisplayName, 160) as string[];
    nameLines.forEach((line) => { doc.text(line, 105, y, { align: "center" }); y += 9; });
    y += 5;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.text("has achieved the following verified environmental impact:", 105, y, { align: "center" });
    y += 16;

    doc.setFontSize(12);
    [`Total Waste Diverted: ${totalKg.toFixed(0)} kg`, `CO2 Emissions Offset: ${co2Saved} kg`, `Water Saved: ${(totalKg * 18).toLocaleString()} liters`, `Energy Conserved: ${(totalKg * 5.8).toFixed(0)} kWh`]
      .forEach((m) => { doc.text(`• ${m}`, 40, y); y += 12; });

    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Certificate ID: ${certId}`, 105, y, { align: "center" });
    doc.text(`Issue Date: ${format(new Date(), "MMM d, yyyy")}`, 105, y + 8, { align: "center" });
    doc.text(`Verification: ${verifyUrl}`, 105, y + 16, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("____________________________", 105, 240, { align: "center" });
    doc.text("Twende Green Ecocycle Platform", 105, 248, { align: "center" });

    await finalizePdf(doc);
    doc.save(`impact-certificate-${certId}.pdf`);
  };

  const orgName = org?.name || profile?.full_name || "Corporate Entity";

  return (
    <div className="space-y-6">
      <Card className="shadow-elevated">
        <CardContent className="p-8 text-center space-y-6">
          <Award className="w-16 h-16 text-primary mx-auto" />
          <div><h3 className="text-xl font-display font-bold text-foreground">Impact Certificate</h3><p className="text-sm text-muted-foreground mt-1">Verified Environmental Impact — Twende Green Ecocycle</p></div>
          <div className="inline-block border-2 border-primary/20 rounded-lg p-6 bg-muted/20"><p className="text-sm text-muted-foreground mb-1">Certified to</p><p className="text-lg font-bold text-foreground">{orgName}</p></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">{[{ v: `${totalKg.toFixed(0)} kg`, l: "Waste Diverted" }, { v: `${co2Saved} kg`, l: "CO₂ Offset" }, { v: `${(totalKg * 18).toLocaleString()}`, l: "Liters Saved" }, { v: `${(totalKg * 5.8).toFixed(0)}`, l: "kWh Saved" }].map(s => (<div key={s.l}><p className="text-lg font-bold text-foreground">{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p></div>))}</div>
          <div className="flex flex-col items-center gap-2"><QRCodeSVG value={verifyUrl} size={120} fgColor="hsl(152,45%,22%)" /><p className="text-xs text-muted-foreground font-mono">{certId}</p></div>
          <Button onClick={downloadCertificate} size="lg"><Download className="w-4 h-4 mr-2" /> Download Certificate PDF</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImpactCertificatesPanel;
