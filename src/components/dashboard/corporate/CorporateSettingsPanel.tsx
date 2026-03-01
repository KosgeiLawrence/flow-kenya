import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Building2, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const CorporateSettingsPanel = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["corp_settings_org", profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile!.organization_id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const updateOrgLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!profile?.organization_id || !user) throw new Error("No organization linked");

      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
      if (!allowedTypes.includes(file.type)) throw new Error("Only PNG, JPG, WebP, or SVG files are allowed");
      if (file.size > 2 * 1024 * 1024) throw new Error("File must be under 2 MB");

      const path = `${profile.organization_id}/logo.${ext}`;

      // Upload (upsert)
      const { error: uploadError } = await supabase.storage
        .from("org-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);

      // Append cache-buster so browsers refetch
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: logoUrl })
        .eq("id", profile.organization_id!);
      if (updateError) throw updateError;

      return logoUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corp_settings_org"] });
      queryClient.invalidateQueries({ queryKey: ["corp_org"] });
      queryClient.invalidateQueries({ queryKey: ["corp_org_epr"] });
      toast.success("Organization logo updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to upload logo");
    },
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("No organization linked");

      const { error } = await supabase
        .from("organizations")
        .update({ logo_url: null })
        .eq("id", profile.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corp_settings_org"] });
      queryClient.invalidateQueries({ queryKey: ["corp_org"] });
      queryClient.invalidateQueries({ queryKey: ["corp_org_epr"] });
      toast.success("Logo removed");
    },
    onError: () => toast.error("Failed to remove logo"),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await updateOrgLogo.mutateAsync(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!profile?.organization_id) {
    return (
      <Card className="shadow-soft">
        <CardContent className="p-8 text-center space-y-3">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No organization linked to your profile. Logo upload requires an organization.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Organization Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Your organization logo appears on EPR compliance receipts, impact certificates, and sustainability reports.
          </p>

          {/* Current logo preview */}
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
              {org?.logo_url ? (
                <img
                  src={org.logo_url}
                  alt="Organization logo"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Building2 className="w-10 h-10 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">{org?.name || "Organization"}</p>
              {org?.logo_url ? (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <CheckCircle2 className="w-3 h-3" />
                  Logo uploaded
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No logo uploaded yet</p>
              )}
            </div>
          </div>

          {/* Upload */}
          <div className="space-y-2">
            <Label htmlFor="logo-upload" className="text-sm">Upload Logo</Label>
            <div className="flex items-center gap-3">
              <Input
                ref={fileRef}
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP or SVG. Max 2 MB. Recommended: 512×512px square.</p>
          </div>

          {org?.logo_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeLogo.mutate()}
              disabled={removeLogo.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove Logo
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CorporateSettingsPanel;
