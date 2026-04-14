import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User, Building2, MapPin, Shield, Camera, Save, CheckCircle2,
  Clock, AlertTriangle, Phone, Mail, Globe, Briefcase, CreditCard,
  Lock, Bell, Eye, Trash2, Upload
} from "lucide-react";

type AppRole = "waste_picker" | "aggregator" | "recycler" | "ngo" | "corporate" | "county_government" | "admin";

interface ProfileSettingsPanelProps {
  role: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  waste_picker: "Waste Picker",
  aggregator: "Aggregator",
  recycler: "Recycler",
  ngo: "NGO",
  corporate: "Corporate",
  county_government: "County Government",
  admin: "Administrator",
};

const wasteCategories = [
  "PET Plastic", "HDPE Plastic", "LDPE Plastic", "PP Plastic",
  "Metal/Aluminium", "Glass", "Paper/Cardboard", "Organic",
  "E-Waste", "Textiles", "Rubber/Tyres", "Mixed Waste"
];

const paymentMethods = ["M-Pesa", "Bank Transfer", "Both"];

const kenyaCounties = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
  "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
  "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
  "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
  "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
  "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans-Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];

const ProfileSettingsPanel = ({ role }: ProfileSettingsPanelProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [orgName, setOrgName] = useState("");
  const [activeSection, setActiveSection] = useState("basic");
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });

  // Fetch full profile with extended fields
  const { data: fullProfile, isLoading } = useQuery({
    queryKey: ["full_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch organization
  const { data: organization } = useQuery({
    queryKey: ["organization", fullProfile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", fullProfile!.organization_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!fullProfile?.organization_id,
  });

  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (fullProfile) {
      setFormData({
        full_name: fullProfile.full_name || "",
        phone_number: fullProfile.phone_number || "",
        email: fullProfile.email || "",
        national_id: fullProfile.national_id || "",
        company_registration: fullProfile.company_registration || "",
        kra_pin: (fullProfile as any).kra_pin || "",
        physical_address: (fullProfile as any).physical_address || "",
        county: (fullProfile as any).county || "",
        sub_county: (fullProfile as any).sub_county || "",
        website: (fullProfile as any).website || "",
        social_media_links: (fullProfile as any).social_media_links || {},
        area_of_operation: (fullProfile as any).area_of_operation || "",
        waste_categories: (fullProfile as any).waste_categories || [],
        daily_capacity_kg: (fullProfile as any).daily_capacity_kg || "",
        monthly_capacity_kg: (fullProfile as any).monthly_capacity_kg || "",
        payment_method: (fullProfile as any).payment_method || "",
        mpesa_number: (fullProfile as any).mpesa_number || "",
        bank_name: (fullProfile as any).bank_name || "",
        bank_account_number: (fullProfile as any).bank_account_number || "",
        industry_sector: (fullProfile as any).industry_sector || "",
        date_of_birth: fullProfile.date_of_birth || "",
        gender: fullProfile.gender || "",
      });
    }
  }, [fullProfile]);

  // Calculate profile completeness
  const calculateCompleteness = useCallback(() => {
    if (!formData.full_name) return 0;
    const fields = [
      "full_name", "phone_number", "email", "county",
      "area_of_operation", "payment_method",
    ];
    if (role !== "admin" && role !== "county_government") {
      fields.push("waste_categories");
    }
    if (!["waste_picker", "admin"].includes(role)) {
      fields.push("company_registration", "kra_pin", "physical_address");
    }
    const filled = fields.filter(f => {
      const v = formData[f];
      if (Array.isArray(v)) return v.length > 0;
      return !!v;
    }).length;
    return Math.round((filled / fields.length) * 100);
  }, [formData, role]);

  const updateProfile = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full_profile"] });
      refreshProfile();
      toast.success("Profile updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be less than 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      await supabase
        .from("profiles")
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq("user_id", user.id);

      queryClient.invalidateQueries({ queryKey: ["full_profile"] });
      await refreshProfile();
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleOrgLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fullProfile?.organization_id) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) { toast.error("Only PNG, JPG, WebP, or SVG files"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("File must be under 2 MB"); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const path = `${fullProfile.organization_id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updErr } = await supabase.from("organizations").update({ logo_url: logoUrl }).eq("id", fullProfile.organization_id);
      if (updErr) throw updErr;
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["corp_settings_org"] });
      queryClient.invalidateQueries({ queryKey: ["org_info"] });
      await refreshProfile();
      toast.success("Organization logo updated");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploadingLogo(false); if (logoInputRef.current) logoInputRef.current.value = ""; }
  };

  const handleRemoveOrgLogo = async () => {
    if (!fullProfile?.organization_id) return;
    const { error } = await supabase.from("organizations").update({ logo_url: null }).eq("id", fullProfile.organization_id);
    if (error) { toast.error("Failed to remove logo"); return; }
    queryClient.invalidateQueries({ queryKey: ["organization"] });
    queryClient.invalidateQueries({ queryKey: ["org_info"] });
    await refreshProfile();
    toast.success("Logo removed");
  };

  const handleSaveSection = (sectionFields: string[]) => {
    const data: Record<string, any> = {};
    sectionFields.forEach(f => {
      data[f] = formData[f] ?? null;
    });
    updateProfile.mutate(data);
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passwordData.new });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setPasswordData({ current: "", new: "", confirm: "" });
    }
  };

  const handleToggleCategory = (cat: string) => {
    setFormData(prev => {
      const cats = prev.waste_categories || [];
      return {
        ...prev,
        waste_categories: cats.includes(cat)
          ? cats.filter((c: string) => c !== cat)
          : [...cats, cat],
      };
    });
  };

  const completeness = calculateCompleteness();
  const statusMap: Record<string, { icon: React.ElementType; label: string; variant: "default" | "secondary" | "destructive" }> = {
    pending: { icon: Clock, label: "Pending Verification", variant: "secondary" },
    approved: { icon: CheckCircle2, label: "Verified", variant: "default" },
    rejected: { icon: AlertTriangle, label: "Rejected", variant: "destructive" },
  };
  const s = statusMap[fullProfile?.approval_status || "pending"];
  const StatusIcon = s.icon;

  const sections = [
    { id: "basic", label: "Basic Info", icon: User },
    ...(!["waste_picker", "admin"].includes(role) ? [{ id: "organization", label: "Organization", icon: Building2 }] : []),
    ...(!["admin", "county_government"].includes(role) ? [{ id: "operational", label: "Operations", icon: MapPin }] : []),
    { id: "security", label: "Security", icon: Shield },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header with Completeness */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="w-20 h-20">
                <AvatarImage src={fullProfile?.avatar_url || ""} alt="Profile" />
                <AvatarFallback className="text-2xl font-display font-bold bg-primary/10 text-primary">
                  {formData.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 bg-foreground/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera className="w-5 h-5 text-background" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-display font-bold">{formData.full_name || "Your Name"}</h2>
                  <p className="text-sm text-muted-foreground">{roleLabels[role]}</p>
                </div>
                <Badge variant={s.variant} className="gap-1.5">
                  <StatusIcon className="w-3.5 h-3.5" />
                  {s.label}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Profile Completeness</span>
                  <span className="font-medium">{completeness}%</span>
                </div>
                <Progress value={completeness} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Navigation */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(sec => (
          <Button
            key={sec.id}
            variant={activeSection === sec.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(sec.id)}
            className="gap-2"
          >
            <sec.icon className="w-4 h-4" />
            {sec.label}
          </Button>
        ))}
      </div>

      {/* Basic Info Section */}
      {activeSection === "basic" && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Basic Information</CardTitle>
            <CardDescription>Your personal details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" value={formData.full_name || ""} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={formData.email || user?.email || ""} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email is linked to your account</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" placeholder="+254..." value={formData.phone_number || ""} onChange={e => setFormData(p => ({ ...p, phone_number: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="national_id">
                  {["corporate", "ngo", "county_government"].includes(role) ? "Registration Number" : "National ID"}
                </Label>
                <Input id="national_id" value={formData.national_id || ""} onChange={e => setFormData(p => ({ ...p, national_id: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input id="date_of_birth" type="date" value={formData.date_of_birth || ""} onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender || ""} onValueChange={v => setFormData(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="flex justify-end">
              <Button onClick={() => handleSaveSection(["full_name", "phone_number", "national_id", "date_of_birth", "gender"])} disabled={updateProfile.isPending} className="gap-2">
                <Save className="w-4 h-4" /> Save Basic Info
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organization Section */}
      {activeSection === "organization" && !["waste_picker", "admin"].includes(role) && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Organization Details</CardTitle>
            <CardDescription>Your company or organization information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {organization && (
                <div className="sm:col-span-2 space-y-2">
                  <Label>Organization Name</Label>
                  <Input value={organization.name} disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground">Contact admin to change organization name</p>
                </div>
              )}

              {/* Organization Logo */}
              {fullProfile?.organization_id && (
                <div className="sm:col-span-2 space-y-3">
                  <Label>Organization Logo</Label>
                  <p className="text-xs text-muted-foreground">This logo appears on your dashboard header, receipts, and reports.</p>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                      {organization?.logo_url ? (
                        <img src={organization.logo_url} alt="Org logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building2 className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="gap-1.5">
                          <Upload className="w-4 h-4" />
                          {uploadingLogo ? "Uploading..." : organization?.logo_url ? "Change Logo" : "Upload Logo"}
                        </Button>
                        {organization?.logo_url && (
                          <Button variant="outline" size="sm" onClick={handleRemoveOrgLogo} className="text-destructive hover:text-destructive gap-1.5">
                            <Trash2 className="w-4 h-4" /> Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WebP or SVG. Max 2 MB.</p>
                      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleOrgLogoUpload} />
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="company_registration">Business Registration Number</Label>
                <Input id="company_registration" value={formData.company_registration || ""} onChange={e => setFormData(p => ({ ...p, company_registration: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kra_pin">KRA PIN</Label>
                <Input id="kra_pin" placeholder="e.g. A012345678Z" value={formData.kra_pin || ""} onChange={e => setFormData(p => ({ ...p, kra_pin: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry_sector">Industry / Sector</Label>
                <Select value={formData.industry_sector || ""} onValueChange={v => setFormData(p => ({ ...p, industry_sector: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waste_management">Waste Management</SelectItem>
                    <SelectItem value="recycling">Recycling & Manufacturing</SelectItem>
                    <SelectItem value="fmcg">FMCG / Consumer Goods</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="agriculture">Agriculture</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="ngo_nonprofit">NGO / Non-Profit</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="physical_address">Physical Address</Label>
                <Input id="physical_address" value={formData.physical_address || ""} onChange={e => setFormData(p => ({ ...p, physical_address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="county">County</Label>
                <Select value={formData.county || ""} onValueChange={v => setFormData(p => ({ ...p, county: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                  <SelectContent>
                    {kenyaCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub_county">Sub-County</Label>
                <Input id="sub_county" value={formData.sub_county || ""} onChange={e => setFormData(p => ({ ...p, sub_county: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" placeholder="https://..." value={formData.website || ""} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} />
              </div>
            </div>

            <Separator />
            <div>
              <Label className="mb-2 block">Social Media</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["twitter", "linkedin", "facebook", "instagram"].map(platform => (
                  <div key={platform} className="space-y-1">
                    <Label className="text-xs capitalize text-muted-foreground">{platform}</Label>
                    <Input
                      placeholder={`${platform} URL or handle`}
                      value={formData.social_media_links?.[platform] || ""}
                      onChange={e => setFormData(p => ({
                        ...p,
                        social_media_links: { ...p.social_media_links, [platform]: e.target.value }
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            <div className="flex justify-end">
              <Button onClick={() => handleSaveSection(["company_registration", "kra_pin", "industry_sector", "physical_address", "county", "sub_county", "website", "social_media_links"])} disabled={updateProfile.isPending} className="gap-2">
                <Save className="w-4 h-4" /> Save Organization Info
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operational Details Section */}
      {activeSection === "operational" && !["admin", "county_government"].includes(role) && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Operational Details</CardTitle>
            <CardDescription>Your area of operation, waste categories, and capacity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area_of_operation">Area of Operation</Label>
                <Select value={formData.area_of_operation || ""} onValueChange={v => setFormData(p => ({ ...p, area_of_operation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select county/ward" /></SelectTrigger>
                  <SelectContent>
                    {kenyaCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_capacity_kg">Daily Capacity (kg)</Label>
                <Input id="daily_capacity_kg" type="number" value={formData.daily_capacity_kg || ""} onChange={e => setFormData(p => ({ ...p, daily_capacity_kg: e.target.value ? Number(e.target.value) : "" }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_capacity_kg">Monthly Capacity (kg)</Label>
                <Input id="monthly_capacity_kg" type="number" value={formData.monthly_capacity_kg || ""} onChange={e => setFormData(p => ({ ...p, monthly_capacity_kg: e.target.value ? Number(e.target.value) : "" }))} />
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Waste Categories Handled</Label>
              <div className="flex flex-wrap gap-2">
                {wasteCategories.map(cat => (
                  <Badge
                    key={cat}
                    variant={(formData.waste_categories || []).includes(cat) ? "default" : "outline"}
                    className="cursor-pointer select-none transition-colors"
                    onClick={() => handleToggleCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Payment Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select value={formData.payment_method || ""} onValueChange={v => setFormData(p => ({ ...p, payment_method: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(formData.payment_method === "M-Pesa" || formData.payment_method === "Both") && (
                  <div className="space-y-2">
                    <Label htmlFor="mpesa_number">M-Pesa Number</Label>
                    <Input id="mpesa_number" placeholder="+254..." value={formData.mpesa_number || ""} onChange={e => setFormData(p => ({ ...p, mpesa_number: e.target.value }))} />
                  </div>
                )}
                {(formData.payment_method === "Bank Transfer" || formData.payment_method === "Both") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input id="bank_name" value={formData.bank_name || ""} onChange={e => setFormData(p => ({ ...p, bank_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_account_number">Account Number</Label>
                      <Input id="bank_account_number" value={formData.bank_account_number || ""} onChange={e => setFormData(p => ({ ...p, bank_account_number: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />
            <div className="flex justify-end">
              <Button onClick={() => handleSaveSection(["area_of_operation", "waste_categories", "daily_capacity_kg", "monthly_capacity_kg", "payment_method", "mpesa_number", "bank_name", "bank_account_number"])} disabled={updateProfile.isPending} className="gap-2">
                <Save className="w-4 h-4" /> Save Operational Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Section */}
      {activeSection === "security" && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Security & Account</CardTitle>
            <CardDescription>Manage password and account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input id="new_password" type="password" value={passwordData.new} onChange={e => setPasswordData(p => ({ ...p, new: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input id="confirm_password" type="password" value={passwordData.confirm} onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handlePasswordChange} size="sm" className="mt-3 gap-2">
                <Lock className="w-4 h-4" /> Update Password
              </Button>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Bell className="w-4 h-4" /> Notification Preferences</h3>
              <div className="space-y-3">
                {[
                  { id: "email_notif", label: "Email Notifications", desc: "Receive updates and alerts via email" },
                  { id: "sms_notif", label: "SMS Notifications", desc: "Get SMS alerts for important events" },
                  { id: "payment_notif", label: "Payment Alerts", desc: "Notify on payment receipts and status changes" },
                ].map(pref => (
                  <div key={pref.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-muted-foreground">{pref.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Eye className="w-4 h-4" /> Data Privacy</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Profile Visibility</p>
                    <p className="text-xs text-muted-foreground">Allow other platform users to see your profile summary</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Data Usage Consent</p>
                    <p className="text-xs text-muted-foreground">Allow Duara Flow to use your data for impact reporting</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfileSettingsPanel;
