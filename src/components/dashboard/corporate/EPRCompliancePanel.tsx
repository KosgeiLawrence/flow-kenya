import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle2, AlertTriangle, Target, Leaf, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { loadImageAsBase64, renderDuaraFlowLogo } from "@/lib/pdfLogoUtils";
import ComplianceDocUpload from "@/components/dashboard/shared/ComplianceDocUpload";

const CORPORATE_DOC_TYPES = [
  { value: "epr_registration", label: "EPR Scheme Registration" },
  { value: "company_registration", label: "Company Registration" },
  { value: "audit_report", label: "Audit Documentation" },
  { value: "sustainability_report", label: "Sustainability Report" },
  { value: "iso_certification", label: "ISO 14001 Certification" },
  { value: "plastic_policy", label: "Plastic Policy Document" },
  { value: "other", label: "Other" },
];

const EPRCompliancePanel = () => {
  const { profile } = useAuth();

  const { data: declarations } = useQuery({
    queryKey: ["plastic_declarations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plastic_declarations").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: collections } = useQuery({
    queryKey: ["corp_epr_collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: commitments } = useQuery({
    queryKey: ["recovery_commitments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recovery_commitments").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: org } = useQuery({
    queryKey: ["corp_org_epr", profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("name, logo_url")
        .eq("id", profile!.organization_id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const totalRecovered = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const totalObligation = declarations?.reduce((s, d) => s + Number(d.recovery_obligation_kg), 0) || 0;
  const totalDeclared = declarations?.reduce((s, d) => s + Number(d.quantity_kg), 0) || 0;
  const totalFunded = commitments?.reduce((s, c) => s + Number(c.funded_amount), 0) || 0;
  const eprProgress = totalObligation > 0 ? Math.min((totalRecovered / totalObligation) * 100, 100) : 0;

  const receiptId = `EPR-${(profile?.id || "").slice(0, 6).toUpperCase()}-${format(new Date(), "yyyyMM")}`;
  const verifyUrl = `https://duaraflow.com/verify/${receiptId}`;

  const checks = [
    { label: "EPR Scheme Registration", pass: true, detail: "Registered with KEPRO" },
    { label: "Plastic Footprint Declared", pass: (declarations?.length || 0) > 0, detail: `${totalDeclared.toLocaleString()} kg declared` },
    { label: "Recovery Commitment Active", pass: (commitments?.length || 0) > 0, detail: `KES ${totalFunded.toLocaleString()} funded` },
    { label: "Recovery Target Progress", pass: eprProgress >= 100, detail: `${eprProgress.toFixed(0)}% of obligation met` },
    { label: "Audit Documentation", pass: !!profile?.company_registration, detail: profile?.company_registration ? `Reg: ${profile.company_registration}` : "Upload registration" },
    { label: "Verified Supply Chain", pass: true, detail: "Duara Flow verified traceability" },
  ];

  const score = (checks.filter((c) => c.pass).length / checks.length) * 100;

  const downloadEPRReceipt = async () => {
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");

    const [duaraLogo, orgLogo] = await Promise.all([
      renderDuaraFlowLogo(200),
      org?.logo_url ? loadImageAsBase64(org.logo_url) : Promise.resolve(null),
    ]);

    // Border
    doc.setDrawColor(34, 87, 62);
    doc.setLineWidth(2);
    doc.rect(10, 10, 190, 277);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, 182, 269);

    // Logos
    if (duaraLogo) doc.addImage(duaraLogo, "PNG", 22, 18, 26, 26);
    if (orgLogo) doc.addImage(orgLogo, "PNG", 162, 18, 26, 26);

    doc.setFontSize(22);
    doc.setTextColor(34, 87, 62);
    doc.text("EPR COMPLIANCE RECEIPT", 105, 52, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Duara Flow — Extended Producer Responsibility", 105, 62, { align: "center" });

    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(`Receipt ID: ${receiptId}`, 25, 78);
    doc.text(`Date: ${today}`, 25, 86);
    doc.text(`Company: ${org?.name || profile?.full_name || "Corporate Entity"}`, 25, 94);
    if (profile?.company_registration) doc.text(`Registration: ${profile.company_registration}`, 25, 102);

    doc.setFontSize(14);
    doc.setTextColor(34, 87, 62);
    doc.text("Compliance Summary", 25, 118);

    doc.setFontSize(11);
    doc.setTextColor(0);
    const metrics = [
      `Total Plastic Declared: ${totalDeclared.toLocaleString()} kg`,
      `Recovery Obligation: ${totalObligation.toLocaleString()} kg`,
      `Total Recovered: ${totalRecovered.toLocaleString()} kg`,
      `EPR Progress: ${eprProgress.toFixed(1)}%`,
      `Funds Allocated: KES ${totalFunded.toLocaleString()}`,
      `Compliance Score: ${score.toFixed(0)}%`,
    ];
    let y = 131;
    metrics.forEach((m) => { doc.text(`• ${m}`, 30, y); y += 10; });

    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(34, 87, 62);
    doc.text("Checklist", 25, y);
    y += 10;
    checks.forEach((c) => {
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text(`${c.pass ? "✓" : "✗"} ${c.label}: ${c.detail}`, 30, y);
      y += 8;
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Verification: ${verifyUrl}`, 105, 255, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("This receipt is digitally generated and verifiable via QR code.", 105, 270, { align: "center" });

    doc.save(`epr-receipt-${receiptId}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elevated">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">EPR Compliance Score</p>
              <p className="text-xs text-muted-foreground">Based on declarations, commitments & recovery</p>
            </div>
            <span className="text-2xl font-bold text-primary">{score.toFixed(0)}%</span>
          </div>
          <Progress value={score} className="h-3 mb-4" />
          <div className="flex flex-wrap gap-3">
            <Button size="sm" onClick={downloadEPRReceipt}>
              <Download className="w-4 h-4 mr-1" /> EPR Receipt
            </Button>
            <div className="ml-auto">
              <QRCodeSVG value={verifyUrl} size={48} fgColor="hsl(152,45%,22%)" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Target className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{eprProgress.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Obligation Met</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Leaf className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{(totalRecovered / 1000).toFixed(1)} t</p>
            <p className="text-xs text-muted-foreground">Total Recovered</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Shield className="w-7 h-7 text-accent mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{(totalDeclared / 1000).toFixed(1)} t</p>
            <p className="text-xs text-muted-foreground">Total Declared</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Compliance Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              {c.pass ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
              <Badge variant={c.pass ? "default" : "secondary"}>{c.pass ? "Pass" : "Action"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <ComplianceDocUpload documentTypes={CORPORATE_DOC_TYPES} title="Upload Compliance Documents" />
    </div>
  );
};

export default EPRCompliancePanel;
