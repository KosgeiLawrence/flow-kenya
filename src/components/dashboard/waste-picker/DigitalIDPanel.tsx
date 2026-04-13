import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2, Clock, Shield, Download, User, Phone, Mail,
  MapPin, Building2, Briefcase, CalendarDays, Activity
} from "lucide-react";
import { calculateImpact } from "@/lib/impactUtils";
import { useRef } from "react";
import { format } from "date-fns";

const DigitalIDPanel = () => {
  const { user, profile, role } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: orgData } = useQuery({
    queryKey: ["org_for_id", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      const { data } = await supabase
        .from("organizations")
        .select("name, logo_url")
        .eq("id", profile.organization_id)
        .single();
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: collections } = useQuery({
    queryKey: ["collections_id", user?.id],
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

  const isVerified = profile?.approval_status === "approved";
  const isOrg = !profile?.is_independent && !!profile?.organization_id;
  const duaraId = `DF-${user?.id?.substring(0, 8).toUpperCase()}`;

  const roleLabelMap: Record<string, string> = {
    waste_picker: "Waste Picker",
    aggregator: "Aggregator",
    recycler: "Recycler",
    ngo: "NGO",
    corporate: "Corporate",
    county_government: "County Government",
    admin: "Administrator",
  };

  const profileUrl = `${window.location.origin}/profile/${user?.id}`;
  const qrData = profileUrl;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `Duara-Digital-ID-${profile?.full_name?.replace(/\s+/g, "_") || "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const joinDate = user?.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "—";

  const idVerificationType = profile?.company_registration
    ? "Business Registration"
    : profile?.national_id
    ? "National ID"
    : "Not provided";

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Downloadable card */}
      <div ref={cardRef} className="rounded-2xl overflow-hidden shadow-elevated border border-border bg-card">
        {/* Header strip */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-4 flex items-center gap-3">
          <img src="/images/duara-flow-logo.svg" alt="Duara Flow" className="h-7 brightness-0 invert" />
          <div className="flex-1" />
          <Badge
            variant={isVerified ? "default" : "secondary"}
            className="gap-1 text-xs font-semibold"
          >
            {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isVerified ? "Verified" : "Unverified"}
          </Badge>
        </div>

        <div className="p-5 space-y-4">
          {/* Identity */}
          <div className="flex items-start gap-4">
            {profile?.avatar_url || orgData?.logo_url ? (
              <img
                src={profile?.avatar_url || orgData?.logo_url || ""}
                alt="Photo"
                className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border-2 border-primary/20">
                <User className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-display font-bold text-foreground leading-tight truncate">
                {isOrg ? orgData?.name || profile?.full_name : profile?.full_name}
              </h2>
              {isOrg && orgData?.name && (
                <p className="text-xs text-muted-foreground truncate">{profile?.full_name}</p>
              )}
              <p className="text-xs font-mono text-primary mt-0.5">{duaraId}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Contact */}
          <div className="grid grid-cols-1 gap-2 text-sm">
            {profile?.phone_number && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{profile.phone_number}</span>
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
            )}
            {(profile?.county || profile?.area_of_operation) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {[profile.area_of_operation, profile.county].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Business Info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium text-foreground">{isOrg ? "Organization" : "Individual"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Value Chain Role</p>
              <p className="font-medium text-foreground">{roleLabelMap[role || ""] || "—"}</p>
            </div>
            {isOrg && orgData?.name && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Business Name</p>
                <p className="font-medium text-foreground">{orgData.name}</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Verification & Registration */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" /> Verification
              </p>
              <p className={`font-medium ${isVerified ? "text-primary" : "text-muted-foreground"}`}>
                {isVerified ? "Verified" : "Unverified"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">ID Type Used</p>
              <p className="font-medium text-foreground">{idVerificationType}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Date Joined
              </p>
              <p className="font-medium text-foreground">{joinDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" /> Status
              </p>
              <p className="font-medium text-primary">Active</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* QR Code */}
          <div className="flex items-center gap-4">
            <div className="p-2 bg-card rounded-lg border border-border">
              <QRCodeSVG value={qrData} size={80} level="H" bgColor="transparent" fgColor="hsl(150, 30%, 10%)" />
            </div>
            <div className="flex-1 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Scan to verify</p>
              <p>Scan this QR code to view this member's profile and impact data on Duara Flow.</p>
            </div>
          </div>

          {/* Impact summary footer */}
          <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-display font-bold text-foreground">{impact.totalKg.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">kg collected</p>
            </div>
            <div>
              <p className="text-sm font-display font-bold text-primary">{impact.co2Avoided.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">kg CO₂ saved</p>
            </div>
            <div>
              <p className="text-sm font-display font-bold text-foreground">{collections?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground">entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download button outside card */}
      <Button onClick={handleDownload} className="w-full gap-2">
        <Download className="w-4 h-4" /> Download Digital ID
      </Button>
    </div>
  );
};

export default DigitalIDPanel;
