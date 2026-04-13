import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, Clock, User, Phone, Mail, MapPin,
  Building2, Briefcase, CalendarDays, Activity, Shield, Leaf, Trash2
} from "lucide-react";
import { format } from "date-fns";

const roleLabelMap: Record<string, string> = {
  waste_picker: "Waste Picker",
  aggregator: "Aggregator",
  recycler: "Recycler",
  ngo: "NGO",
  corporate: "Corporate",
  county_government: "County Government",
  admin: "Administrator",
};

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-public-profile", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });
      // Edge function via GET doesn't work well with invoke, use fetch instead
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-profile?userId=${userId}`,
        { headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!res.ok) throw new Error("Profile not found");
      return res.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-3">
            <User className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-display font-bold text-foreground">Profile Not Found</h2>
            <p className="text-sm text-muted-foreground">This profile may not exist or is not publicly available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isVerified = profile.isVerified;
  const isOrg = !profile.isIndependent && !!profile.orgName;
  const joinDate = profile.joinedAt ? format(new Date(profile.joinedAt), "dd MMM yyyy") : "—";
  const idType = profile.hasBusinessReg ? "Business Registration" : profile.hasNationalId ? "National ID" : "Not provided";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Main card */}
        <div className="rounded-2xl overflow-hidden shadow-elevated border border-border bg-card">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-4 flex items-center gap-3">
            <img src="/images/duara-flow-logo.svg" alt="Duara Flow" className="h-7 brightness-0 invert" />
            <div className="flex-1" />
            <Badge variant={isVerified ? "default" : "secondary"} className="gap-1 text-xs font-semibold">
              {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {isVerified ? "Verified" : "Unverified"}
            </Badge>
          </div>

          <div className="p-5 space-y-4">
            {/* Identity */}
            <div className="flex items-start gap-4">
              {profile.avatarUrl || profile.orgLogo ? (
                <img
                  src={profile.avatarUrl || profile.orgLogo}
                  alt="Photo"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border-2 border-primary/20">
                  <User className="w-7 h-7 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-display font-bold text-foreground leading-tight truncate">
                  {isOrg ? profile.orgName : profile.fullName}
                </h1>
                {isOrg && (
                  <p className="text-xs text-muted-foreground truncate">{profile.fullName}</p>
                )}
                <p className="text-xs font-mono text-primary mt-0.5">{profile.duaraId}</p>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Contact */}
            <div className="grid grid-cols-1 gap-2 text-sm">
              {profile.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{profile.phone}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
              )}
              {(profile.county || profile.areaOfOperation) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    {[profile.areaOfOperation, profile.county].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Business Info */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium text-foreground">{isOrg ? "Organization" : "Individual"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Value Chain Role</p>
                <p className="font-medium text-foreground">{roleLabelMap[profile.role] || "—"}</p>
              </div>
              {isOrg && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Business Name</p>
                  <p className="font-medium text-foreground">{profile.orgName}</p>
                </div>
              )}
            </div>

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
                <p className="font-medium text-foreground">{idType}</p>
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

            <div className="border-t border-border" />

            {/* Impact summary */}
            <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-sm font-display font-bold text-foreground">{profile.totalKg?.toFixed(0) || 0}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> kg collected
                </p>
              </div>
              <div>
                <p className="text-sm font-display font-bold text-foreground">{profile.totalEntries || 0}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Leaf className="w-3 h-3" /> entries
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-primary">Duara Flow</span>
        </p>
      </div>
    </div>
  );
};

export default PublicProfile;
