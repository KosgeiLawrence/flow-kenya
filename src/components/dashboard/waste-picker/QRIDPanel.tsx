import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Shield, Leaf } from "lucide-react";
import { calculateImpact } from "@/lib/impactUtils";

const QRIDPanel = () => {
  const { user, profile } = useAuth();

  const { data: collections } = useQuery({
    queryKey: ["collections_qr", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const impact = calculateImpact(
    (collections || []).map(c => ({ quantity: c.quantity, material_types: (c as any).material_types }))
  );

  const qrData = JSON.stringify({
    platform: "duara-flow",
    userId: user?.id,
    name: profile?.full_name,
    role: "waste_picker",
    status: profile?.approval_status,
    totalKg: impact.totalKg,
    co2Avoided: impact.co2Avoided,
  });

  const isVerified = profile?.approval_status === "approved";

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <Card className="shadow-elevated">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-base">Digital QR ID</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="p-4 bg-card rounded-xl border border-border">
              <QRCodeSVG value={qrData} size={200} level="H" bgColor="transparent" fgColor="hsl(150, 30%, 10%)" />
            </div>
            {isVerified && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-lg font-display font-bold text-foreground">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">Waste Picker</p>
            <Badge variant={isVerified ? "default" : "secondary"} className="gap-1.5 mt-2">
              {isVerified ? <Shield className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {isVerified ? "Verified" : "Pending Verification"}
            </Badge>
          </div>

          {/* Cumulative impact on QR card */}
          <div className="w-full border-t border-border pt-4">
            <div className="flex items-center gap-1.5 mb-2 justify-center">
              <Leaf className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Cumulative Impact</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-display font-bold">{impact.totalKg.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">kg collected</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold text-primary">{impact.co2Avoided.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">kg CO₂ saved</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold">{(collections?.length || 0)}</p>
                <p className="text-xs text-muted-foreground">entries</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Show this QR code at collection points for instant identity verification and impact tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRIDPanel;
