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
import { useTranslation } from "react-i18next";

const DigitalIDPanel = () => {
  const { user, profile, role } = useAuth();
  const { t } = useTranslation();
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
    waste_picker: t("roles.wastePicker"),
    aggregator: t("roles.aggregator"),
    recycler: t("roles.recycler"),
    ngo: t("roles.ngo"),
    corporate: t("roles.corporate"),
    county_government: t("roles.countyGovernment"),
    admin: t("roles.admin"),
  };

  const profileUrl = `https://duaraflow.co.ke/profile/${user?.id}`;
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

  const INK = "#12251b";
  const MUTED = "rgba(18,37,27,0.55)";
  const ACCENT = "#2b5e3f";

  return (
    <div className="space-y-5 max-w-md mx-auto">
      {/* Soft UI floating frame */}
      <div className="rounded-[34px] bg-card p-3 shadow-elevated">
      {/* Downloadable card */}
      <div
        ref={cardRef}
        className="rounded-[26px] overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #FFFFFF 0%, #F4F5F3 100%)",
          boxShadow: "0 18px 44px -22px rgba(18,37,27,0.28), inset 0 1px 0 rgba(255,255,255,0.9)",
          color: INK,
        }}
      >
        {/* Header strip */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ background: "rgba(43,94,63,0.06)", borderBottom: "1px solid rgba(18,37,27,0.07)" }}
        >
          <img src="/images/duara-flow-logo.svg" alt="Duara Flow" className="h-7" />
          <div className="flex-1" />
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: isVerified ? ACCENT : "rgba(18,37,27,0.06)",
              color: isVerified ? "#ffffff" : MUTED,
              boxShadow: isVerified ? "0 6px 14px -8px rgba(43,94,63,0.8)" : "inset 0 1px 2px rgba(18,37,27,0.08)",
            }}
          >
            {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isVerified ? t("common.verified") : t("digitalIdPanel.unverified", "Unverified")}
          </span>
        </div>

        <div className="p-5 space-y-4" style={{ color: INK }}>
          {/* Identity */}
          <div className="flex items-start gap-4">
            {profile?.avatar_url || orgData?.logo_url ? (
              <img
                src={profile?.avatar_url || orgData?.logo_url || ""}
                alt="Photo"
                className="w-16 h-16 rounded-2xl object-cover shrink-0"
                style={{ boxShadow: "0 8px 20px -12px rgba(18,37,27,0.5)" }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "#F2F3F5", boxShadow: "inset 2px 2px 6px rgba(18,37,27,0.10), inset -2px -2px 6px #ffffff" }}
              >
                <User className="w-7 h-7" style={{ color: ACCENT }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-display font-bold leading-tight break-words" style={{ color: INK }}>
                {isOrg ? orgData?.name || profile?.full_name : profile?.full_name}
              </h2>
              {isOrg && orgData?.name && (
                <p className="text-xs truncate" style={{ color: MUTED }}>{profile?.full_name}</p>
              )}
              <p className="text-xs font-mono mt-1" style={{ color: ACCENT }}>{duaraId}</p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(18,37,27,0.08)" }} />

          {/* Contact */}
          <div className="grid grid-cols-1 gap-2 text-sm">
            {profile?.phone_number && (
              <div className="flex items-center gap-2" style={{ color: INK }}>
                <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                <span className="truncate">{profile.phone_number}</span>
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-2" style={{ color: INK }}>
                <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                <span className="truncate">{profile.email}</span>
              </div>
            )}
            {(profile?.county || profile?.area_of_operation) && (
              <div className="flex items-center gap-2" style={{ color: INK }}>
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                <span className="truncate">
                  {[profile.area_of_operation, profile.county].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(18,37,27,0.08)" }} />

          {/* Business Info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <p style={{ color: MUTED }}>{t("common.type")}</p>
              <p className="font-medium" style={{ color: INK }}>{isOrg ? t("profilePanel.organization") : t("digitalIdPanel.individual", "Individual")}</p>
            </div>
            <div>
              <p style={{ color: MUTED }}>{t("digitalIdPanel.valueChainRole", "Value Chain Role")}</p>
              <p className="font-medium" style={{ color: INK }}>{roleLabelMap[role || ""] || "—"}</p>
            </div>
            {isOrg && orgData?.name && (
              <div className="col-span-2">
                <p style={{ color: MUTED }}>{t("digitalIdPanel.businessName", "Business Name")}</p>
                <p className="font-medium break-words" style={{ color: INK }}>{orgData.name}</p>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(18,37,27,0.08)" }} />

          {/* Verification & Registration */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <p className="flex items-center gap-1" style={{ color: MUTED }}>
                <Shield className="w-3 h-3" /> {t("digitalIdPanel.verificationStatus")}
              </p>
              <p className="font-medium" style={{ color: isVerified ? ACCENT : MUTED }}>
                {isVerified ? t("common.verified") : t("digitalIdPanel.unverified", "Unverified")}
              </p>
            </div>
            <div>
              <p style={{ color: MUTED }}>{t("digitalIdPanel.idTypeUsed", "ID Type Used")}</p>
              <p className="font-medium" style={{ color: INK }}>{idVerificationType}</p>
            </div>
            <div>
              <p className="flex items-center gap-1" style={{ color: MUTED }}>
                <CalendarDays className="w-3 h-3" /> {t("digitalIdPanel.memberSince")}
              </p>
              <p className="font-medium" style={{ color: INK }}>{joinDate}</p>
            </div>
            <div>
              <p className="flex items-center gap-1" style={{ color: MUTED }}>
                <Activity className="w-3 h-3" /> {t("common.status")}
              </p>
              <p className="font-medium" style={{ color: ACCENT }}>Active</p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(18,37,27,0.08)" }} />

          {/* QR Code */}
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-2xl shrink-0"
              style={{ background: "#FFFFFF", boxShadow: "inset 2px 2px 6px rgba(18,37,27,0.10), inset -2px -2px 6px #ffffff, 0 8px 18px -14px rgba(18,37,27,0.45)" }}
            >
              <QRCodeSVG value={qrData} size={84} level="H" bgColor="#FFFFFF" fgColor={INK} />
            </div>
            <div className="flex-1 text-xs space-y-1" style={{ color: MUTED }}>
              <p className="font-medium" style={{ color: INK }}>{t("digitalIdPanel.scanToVerify")}</p>
              <p>{t("digitalIdPanel.scanDescription", "Scan this QR code to view this member's profile and impact data on Duara Flow.")}</p>
            </div>
          </div>

          {/* Impact summary footer */}
          <div
            className="rounded-2xl p-3 grid grid-cols-3 gap-2 text-center"
            style={{ background: "#F2F3F5", boxShadow: "inset 2px 2px 6px rgba(18,37,27,0.08), inset -2px -2px 6px #ffffff" }}
          >
            <div>
              <p className="text-sm font-display font-bold" style={{ color: INK }}>{impact.totalKg.toFixed(0)}</p>
              <p className="text-[10px]" style={{ color: MUTED }}>{t("digitalIdPanel.kgCollected", "kg collected")}</p>
            </div>
            <div>
              <p className="text-sm font-display font-bold" style={{ color: ACCENT }}>{impact.co2Avoided.toFixed(0)}</p>
              <p className="text-[10px]" style={{ color: MUTED }}>{t("digitalIdPanel.co2Saved", "kg CO₂ saved")}</p>
            </div>
            <div>
              <p className="text-sm font-display font-bold" style={{ color: INK }}>{collections?.length || 0}</p>
              <p className="text-[10px]" style={{ color: MUTED }}>{t("digitalIdPanel.entries", "entries")}</p>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Download button outside card */}
      <Button onClick={handleDownload} className="w-full gap-2 rounded-2xl h-12 shadow-soft">
        <Download className="w-4 h-4" /> {t("digitalIdPanel.downloadId")}
      </Button>
    </div>
  );
};

export default DigitalIDPanel;
