import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Shield } from "lucide-react";

const QRIDPanel = () => {
  const { user, profile } = useAuth();

  const qrData = JSON.stringify({
    platform: "duara-flow",
    userId: user?.id,
    name: profile?.full_name,
    role: "waste_picker",
    status: profile?.approval_status,
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
              <QRCodeSVG
                value={qrData}
                size={200}
                level="H"
                bgColor="transparent"
                fgColor="hsl(150, 30%, 10%)"
              />
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

          <p className="text-xs text-muted-foreground text-center">
            Show this QR code at collection points for instant identity verification and material logging.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRIDPanel;
