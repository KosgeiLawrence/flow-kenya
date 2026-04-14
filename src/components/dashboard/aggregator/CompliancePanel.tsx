import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Leaf, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ComplianceDocUpload from "@/components/dashboard/shared/ComplianceDocUpload";
import { useTranslation } from "react-i18next";

const AGGREGATOR_DOC_TYPES = [
  { value: "business_registration", label: "Business Registration" },
  { value: "county_permit", label: "County Trade Permit" },
  { value: "nema_license", label: "NEMA License" },
  { value: "waste_transport_permit", label: "Waste Transport Permit" },
  { value: "national_id", label: "National ID / Director ID" },
  { value: "tax_compliance", label: "Tax Compliance Certificate" },
  { value: "other", label: "Other" },
];

const CompliancePanel = () => {
  const { user, profile } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["aggregator_compliance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalKg = collections?.reduce((s, c) => s + Number(c.quantity), 0) || 0;
  const plasticCollections = collections?.filter((c) => {
    const name = ((c as any).material_types?.name || "").toLowerCase();
    return name.includes("pet") || name.includes("hdpe") || name.includes("plastic");
  }) || [];
  const plasticKg = plasticCollections.reduce((s, c) => s + Number(c.quantity), 0);

  const eprTarget = 500;
  const eprProgress = Math.min((plasticKg / eprTarget) * 100, 100);
  const co2Offset = (plasticKg * 2.5).toFixed(1);

  const hasDocumentation = !!profile?.company_registration;
  const isApproved = profile?.approval_status === "approved";

  const checks = [
    { label: "Account Verified", pass: isApproved, detail: isApproved ? "Your account is verified" : "Awaiting admin approval" },
    { label: "Business Registration", pass: hasDocumentation, detail: hasDocumentation ? `Reg: ${profile?.company_registration}` : "No registration on file" },
    { label: "EPR Target Progress", pass: eprProgress >= 100, detail: `${plasticKg.toFixed(1)} / ${eprTarget} kg plastic collected` },
    { label: "Traceability Records", pass: (collections?.length || 0) > 0, detail: `${collections?.length || 0} collection records` },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">Compliance Score</p>
              <p className="text-xs text-muted-foreground">Based on documentation, EPR targets, and traceability</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Progress value={(checks.filter((c) => c.pass).length / checks.length) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-foreground">
              {checks.filter((c) => c.pass).length}/{checks.length}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Compliance Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              {c.pass ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
              <Badge variant={c.pass ? "default" : "secondary"} className="ml-auto shrink-0">
                {c.pass ? "Pass" : "Action Needed"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <ComplianceDocUpload documentTypes={AGGREGATOR_DOC_TYPES} title="Upload Compliance Documents" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Leaf className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{co2Offset} kg</p>
            <p className="text-xs text-muted-foreground">CO₂ Offset (est.)</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <FileCheck className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{plasticKg.toFixed(1)} kg</p>
            <p className="text-xs text-muted-foreground">Plastic Recovered</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{eprProgress.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">EPR Target</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompliancePanel;
