import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";
import { format } from "date-fns";
import ComplianceDocUpload from "@/components/dashboard/shared/ComplianceDocUpload";
import { addBrandedHeader, addDocMeta, addSectionTitle, finalizePdf } from "@/lib/pdfBranding";
import { useTranslation } from "react-i18next";

const RECYCLER_DOC_TYPES = [
  { value: "nema_license", label: "NEMA License" },
  { value: "epr_registration", label: "EPR Registration" },
  { value: "business_registration", label: "Business Registration" },
  { value: "national_id", label: "National ID / Director ID" },
  { value: "fire_safety", label: "Fire Safety Certificate" },
  { value: "environmental_audit", label: "Environmental Audit Report" },
  { value: "other", label: "Other" },
];

const ComplianceDocsPanel = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const isApproved = profile?.approval_status === "approved";
  const hasRegistration = !!profile?.company_registration;
  const hasNationalId = !!profile?.national_id;

  const checks = [
    { label: "Account Verification", pass: isApproved, detail: isApproved ? "Account verified by admin" : "Pending admin verification" },
    { label: "Business Registration", pass: hasRegistration, detail: hasRegistration ? `Reg: ${profile?.company_registration}` : "Upload business registration" },
    { label: "National ID / Director ID", pass: hasNationalId, detail: hasNationalId ? "ID on file" : "Upload identification" },
    { label: "NEMA License", pass: false, detail: "Not yet submitted — required for recycling operations" },
    { label: "EPR Registration", pass: false, detail: "Register with KEPRO or relevant EPR scheme" },
  ];

  const score = (checks.filter((c) => c.pass).length / checks.length) * 100;

  const downloadComplianceReport = async () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    let y = await addBrandedHeader(doc, "Compliance Report", "Regulatory requirements for recycling operations");

    y = addDocMeta(doc, [
      { label: "Date", value: format(new Date(), "MMM d, yyyy") },
      { label: "Entity", value: profile?.full_name || "Recycler" },
      { label: "Score", value: `${score.toFixed(0)}%` },
    ], y);

    y = addSectionTitle(doc, "Compliance Checklist", y);

    const labelMaxW = pw - 17 - 20;   // body width minus indent + right margin
    const detailMaxW = pw - 25 - 20;

    checks.forEach((c) => {
      // Use plain ASCII tokens — Helvetica in jsPDF can render unicode ✓/✗ as boxes.
      const status = c.pass ? "[OK] " : "[--] ";
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const labelLines = doc.splitTextToSize(`${status}${c.label}`, labelMaxW) as string[];
      labelLines.forEach((line, i) => { doc.text(line, 17, y + i * 5); });
      let cursor = y + labelLines.length * 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const detailLines = doc.splitTextToSize(c.detail, detailMaxW) as string[];
      detailLines.forEach((line, i) => { doc.text(line, 25, cursor + 1 + i * 4); });

      doc.setTextColor(30, 30, 30);
      y = cursor + 1 + detailLines.length * 4 + 6;
    });

    await finalizePdf(doc);
    doc.save(`compliance-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">{t("compliancePanel.title")}</p>
              <p className="text-xs text-muted-foreground">Regulatory requirements for recycling operations</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Progress value={score} className="flex-1 h-3" />
            <span className="text-sm font-bold text-foreground">{checks.filter((c) => c.pass).length}/{checks.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("compliancePanel.checklist", "Checklist")}</CardTitle>
          <Button size="sm" variant="outline" onClick={downloadComplianceReport}>
            <Download className="w-4 h-4 mr-1" /> Download Report
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              {c.pass ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
              <Badge variant={c.pass ? "default" : "secondary"} className="shrink-0">{c.pass ? "Complete" : "Required"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <ComplianceDocUpload documentTypes={RECYCLER_DOC_TYPES} title="Upload Compliance Documents" />
    </div>
  );
};

export default ComplianceDocsPanel;
