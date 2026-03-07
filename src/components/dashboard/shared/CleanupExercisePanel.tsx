import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, MapPin, Users, Trash2, Package, Eye, Download, FileText,
  Camera, ChevronDown, ChevronUp, Loader2, Upload, X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";

interface CleanupExercise {
  id: string;
  title: string;
  cleanup_date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  location_type: string;
  lead_organizer: string;
  num_volunteers: number;
  num_waste_pickers: number;
  num_partner_orgs: number;
  total_waste_kg: number;
  plastic_waste_kg: number;
  recyclable_waste_kg: number;
  non_recyclable_waste_kg: number;
  num_bags: number;
  pet_bottles_kg: number;
  hdpe_kg: number;
  fishing_nets_kg: number;
  sachets_kg: number;
  glass_kg: number;
  metal_kg: number;
  other_materials_kg: number;
  waste_destination: string | null;
  transport_method: string | null;
  waste_sorted: boolean;
  before_photos: string[];
  during_photos: string[];
  after_photos: string[];
  observations: string | null;
  environmental_issues: string | null;
  recommendations: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

const LOCATION_TYPES = [
  { value: "beach", label: "Beach" },
  { value: "river", label: "River" },
  { value: "community", label: "Community" },
  { value: "public_space", label: "Public Space" },
  { value: "forest", label: "Forest" },
  { value: "roadside", label: "Roadside" },
];

const emptyForm = {
  title: "",
  cleanup_date: format(new Date(), "yyyy-MM-dd"),
  start_time: "08:00",
  end_time: "12:00",
  location_name: "",
  location_lat: null as number | null,
  location_lng: null as number | null,
  location_type: "community",
  lead_organizer: "",
  num_volunteers: 0,
  num_waste_pickers: 0,
  num_partner_orgs: 0,
  total_waste_kg: 0,
  plastic_waste_kg: 0,
  recyclable_waste_kg: 0,
  non_recyclable_waste_kg: 0,
  num_bags: 0,
  pet_bottles_kg: 0,
  hdpe_kg: 0,
  fishing_nets_kg: 0,
  sachets_kg: 0,
  glass_kg: 0,
  metal_kg: 0,
  other_materials_kg: 0,
  waste_destination: "",
  transport_method: "",
  waste_sorted: false,
  observations: "",
  environmental_issues: "",
  recommendations: "",
  partner_org_ids: [] as string[],
};

interface Props {
  isAdmin?: boolean;
}

const CleanupExercisePanel = ({ isAdmin = false }: Props) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [viewCleanup, setViewCleanup] = useState<CleanupExercise | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [duringPhotos, setDuringPhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const { data: cleanups = [], isLoading } = useQuery({
    queryKey: ["cleanup-exercises", isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cleanup_exercises")
        .select("*")
        .order("cleanup_date", { ascending: false });
      if (error) throw error;
      return data as CleanupExercise[];
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, type")
        .order("name");
      if (error) throw error;
      return data as Organization[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      const { partner_org_ids, ...cleanupData } = formData;
      const { data, error } = await supabase
        .from("cleanup_exercises")
        .insert({
          ...cleanupData,
          user_id: user!.id,
          before_photos: beforePhotos,
          during_photos: duringPhotos,
          after_photos: afterPhotos,
          waste_destination: cleanupData.waste_destination || null,
          transport_method: cleanupData.transport_method || null,
          observations: cleanupData.observations || null,
          environmental_issues: cleanupData.environmental_issues || null,
          recommendations: cleanupData.recommendations || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert partner organizations
      if (partner_org_ids.length > 0) {
        const partners = partner_org_ids.map((orgId) => ({
          cleanup_id: data.id,
          organization_id: orgId,
        }));
        const { error: partnerError } = await supabase
          .from("cleanup_partners")
          .insert(partners);
        if (partnerError) throw partnerError;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleanup-exercises"] });
      setShowForm(false);
      setForm({ ...emptyForm });
      setBeforePhotos([]);
      setDuringPhotos([]);
      setAfterPhotos([]);
      toast.success("Cleanup exercise logged successfully!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cleanup_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleanup-exercises"] });
      toast.success("Cleanup deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          location_lat: pos.coords.latitude,
          location_lng: pos.coords.longitude,
        }));
        setGeoLoading(false);
        toast.success("Location detected!");
      },
      () => {
        setGeoLoading(false);
        toast.error("Unable to detect location");
      }
    );
  };

  const uploadPhoto = async (file: File, category: string) => {
    setUploading(category);
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("cleanup-photos").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("cleanup-photos").getPublicUrl(path);
    const url = urlData.publicUrl;

    if (category === "before") setBeforePhotos((p) => [...p, url]);
    else if (category === "during") setDuringPhotos((p) => [...p, url]);
    else setAfterPhotos((p) => [...p, url]);
    setUploading(null);
  };

  const removePhoto = (category: string, index: number) => {
    if (category === "before") setBeforePhotos((p) => p.filter((_, i) => i !== index));
    else if (category === "during") setDuringPhotos((p) => p.filter((_, i) => i !== index));
    else setAfterPhotos((p) => p.filter((_, i) => i !== index));
  };

  const togglePartnerOrg = (orgId: string) => {
    setForm((f) => ({
      ...f,
      partner_org_ids: f.partner_org_ids.includes(orgId)
        ? f.partner_org_ids.filter((id) => id !== orgId)
        : [...f.partner_org_ids, orgId],
      num_partner_orgs: f.partner_org_ids.includes(orgId)
        ? f.partner_org_ids.length - 1
        : f.partner_org_ids.length + 1,
    }));
  };

  const generatePDF = (cleanup: CleanupExercise) => {
    const doc = new jsPDF();
    let y = 20;
    const addLine = (text: string, size = 10, bold = false) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, 170);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += size * 0.5 + 2;
      });
    };

    addLine("CLEANUP EXERCISE REPORT", 18, true);
    y += 5;
    addLine(`Event: ${cleanup.title}`, 14, true);
    addLine(`Date: ${format(new Date(cleanup.cleanup_date), "PPP")}`);
    addLine(`Time: ${cleanup.start_time} - ${cleanup.end_time}`);
    addLine(`Location: ${cleanup.location_name} (${LOCATION_TYPES.find(l => l.value === cleanup.location_type)?.label || cleanup.location_type})`);
    if (cleanup.location_lat && cleanup.location_lng) {
      addLine(`GPS: ${cleanup.location_lat}, ${cleanup.location_lng}`);
    }
    y += 5;
    addLine("Organizer Information", 12, true);
    addLine(`Lead Organizer: ${cleanup.lead_organizer}`);
    y += 5;
    addLine("Participation", 12, true);
    addLine(`Volunteers: ${cleanup.num_volunteers}`);
    addLine(`Waste Pickers: ${cleanup.num_waste_pickers}`);
    addLine(`Partner Organizations: ${cleanup.num_partner_orgs}`);
    y += 5;
    addLine("Waste Collection Summary", 12, true);
    addLine(`Total Waste: ${cleanup.total_waste_kg} kg`);
    addLine(`Plastic Waste: ${cleanup.plastic_waste_kg} kg`);
    addLine(`Recyclable Waste: ${cleanup.recyclable_waste_kg} kg`);
    addLine(`Non-Recyclable Waste: ${cleanup.non_recyclable_waste_kg} kg`);
    addLine(`Bags Collected: ${cleanup.num_bags}`);
    y += 3;
    addLine("Waste Breakdown", 11, true);
    addLine(`PET Bottles: ${cleanup.pet_bottles_kg} kg | HDPE: ${cleanup.hdpe_kg} kg`);
    addLine(`Fishing Nets: ${cleanup.fishing_nets_kg} kg | Sachets: ${cleanup.sachets_kg} kg`);
    addLine(`Glass: ${cleanup.glass_kg} kg | Metal: ${cleanup.metal_kg} kg | Other: ${cleanup.other_materials_kg} kg`);
    y += 5;
    addLine("Logistics", 12, true);
    addLine(`Destination: ${cleanup.waste_destination || "N/A"}`);
    addLine(`Transport: ${cleanup.transport_method || "N/A"}`);
    addLine(`Waste Sorted: ${cleanup.waste_sorted ? "Yes" : "No"}`);
    if (cleanup.observations) { y += 5; addLine("Observations", 12, true); addLine(cleanup.observations); }
    if (cleanup.environmental_issues) { y += 3; addLine("Environmental Issues", 12, true); addLine(cleanup.environmental_issues); }
    if (cleanup.recommendations) { y += 3; addLine("Recommendations", 12, true); addLine(cleanup.recommendations); }

    y += 10;
    addLine(`Generated by Duara Flow on ${format(new Date(), "PPP")}`, 8);

    doc.save(`cleanup-report-${cleanup.title.replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF report downloaded");
  };

  const exportCSV = (cleanup: CleanupExercise) => {
    const headers = [
      "Title", "Date", "Start Time", "End Time", "Location", "Location Type", "Lat", "Lng",
      "Lead Organizer", "Volunteers", "Waste Pickers", "Partner Orgs",
      "Total Waste (kg)", "Plastic (kg)", "Recyclable (kg)", "Non-Recyclable (kg)", "Bags",
      "PET (kg)", "HDPE (kg)", "Fishing Nets (kg)", "Sachets (kg)", "Glass (kg)", "Metal (kg)", "Other (kg)",
      "Destination", "Transport", "Sorted", "Observations", "Environmental Issues", "Recommendations"
    ];
    const values = [
      cleanup.title, cleanup.cleanup_date, cleanup.start_time, cleanup.end_time,
      cleanup.location_name, cleanup.location_type, cleanup.location_lat, cleanup.location_lng,
      cleanup.lead_organizer, cleanup.num_volunteers, cleanup.num_waste_pickers, cleanup.num_partner_orgs,
      cleanup.total_waste_kg, cleanup.plastic_waste_kg, cleanup.recyclable_waste_kg, cleanup.non_recyclable_waste_kg, cleanup.num_bags,
      cleanup.pet_bottles_kg, cleanup.hdpe_kg, cleanup.fishing_nets_kg, cleanup.sachets_kg, cleanup.glass_kg, cleanup.metal_kg, cleanup.other_materials_kg,
      cleanup.waste_destination, cleanup.transport_method, cleanup.waste_sorted ? "Yes" : "No",
      cleanup.observations, cleanup.environmental_issues, cleanup.recommendations
    ];
    const csv = [headers.join(","), values.map((v) => `"${v ?? ""}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleanup-${cleanup.title.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const PhotoUpload = ({ category, photos, label }: { category: string; photos: string[]; label: string }) => (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2 mt-1">
        {photos.map((url, i) => (
          <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => removePhoto(category, i)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <label className="w-16 h-16 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
          {uploading === category ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], category)} />
        </label>
      </div>
    </div>
  );

  // Stats
  const totalCleanups = cleanups.length;
  const totalWaste = cleanups.reduce((s, c) => s + Number(c.total_waste_kg), 0);
  const totalVolunteers = cleanups.reduce((s, c) => s + c.num_volunteers + c.num_waste_pickers, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Cleanups</p>
            <p className="text-2xl font-bold text-foreground">{totalCleanups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Waste Collected</p>
            <p className="text-2xl font-bold text-foreground">{totalWaste.toLocaleString()} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Participants</p>
            <p className="text-2xl font-bold text-foreground">{totalVolunteers.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      {!isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" /> Log Cleanup Exercise
          </Button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log Cleanup Exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Cleanup Title / Event Name</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Nairobi River Cleanup 2026" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.cleanup_date} onChange={(e) => setForm({ ...form, cleanup_date: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Location Name</Label>
                  <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="e.g. Kiambu Beach" />
                </div>
                <div>
                  <Label>Location Type</Label>
                  <Select value={form.location_type} onValueChange={(v) => setForm({ ...form, location_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map((lt) => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>GPS Coordinates</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Latitude" value={form.location_lat ?? ""} onChange={(e) => setForm({ ...form, location_lat: e.target.value ? Number(e.target.value) : null })} />
                    <Input type="number" placeholder="Longitude" value={form.location_lng ?? ""} onChange={(e) => setForm({ ...form, location_lng: e.target.value ? Number(e.target.value) : null })} />
                    <Button type="button" variant="outline" onClick={detectLocation} disabled={geoLoading} className="shrink-0">
                      {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Organizer */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Organizer</h4>
              <div>
                <Label>Lead Organizer</Label>
                <Input value={form.lead_organizer || profile?.full_name || ""} onChange={(e) => setForm({ ...form, lead_organizer: e.target.value })} />
              </div>
              {organizations.length > 0 && (
                <div className="mt-3">
                  <Label>Partner Organizations</Label>
                  <div className="flex flex-wrap gap-2 mt-1 max-h-32 overflow-y-auto">
                    {organizations.map((org) => (
                      <Badge
                        key={org.id}
                        variant={form.partner_org_ids.includes(org.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => togglePartnerOrg(org.id)}
                      >
                        {org.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Participation */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Participation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label>Volunteers</Label><Input type="number" min={0} value={form.num_volunteers} onChange={(e) => setForm({ ...form, num_volunteers: Number(e.target.value) })} /></div>
                <div><Label>Waste Pickers</Label><Input type="number" min={0} value={form.num_waste_pickers} onChange={(e) => setForm({ ...form, num_waste_pickers: Number(e.target.value) })} /></div>
                <div><Label>Partner Orgs Present</Label><Input type="number" min={0} value={form.num_partner_orgs} onChange={(e) => setForm({ ...form, num_partner_orgs: Number(e.target.value) })} /></div>
              </div>
            </div>

            <Separator />

            {/* Waste Data */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Waste Collection</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div><Label>Total Waste (kg)</Label><Input type="number" min={0} value={form.total_waste_kg} onChange={(e) => setForm({ ...form, total_waste_kg: Number(e.target.value) })} /></div>
                <div><Label>Plastic Waste (kg)</Label><Input type="number" min={0} value={form.plastic_waste_kg} onChange={(e) => setForm({ ...form, plastic_waste_kg: Number(e.target.value) })} /></div>
                <div><Label>Recyclable (kg)</Label><Input type="number" min={0} value={form.recyclable_waste_kg} onChange={(e) => setForm({ ...form, recyclable_waste_kg: Number(e.target.value) })} /></div>
                <div><Label>Non-Recyclable (kg)</Label><Input type="number" min={0} value={form.non_recyclable_waste_kg} onChange={(e) => setForm({ ...form, non_recyclable_waste_kg: Number(e.target.value) })} /></div>
                <div><Label>Number of Bags</Label><Input type="number" min={0} value={form.num_bags} onChange={(e) => setForm({ ...form, num_bags: Number(e.target.value) })} /></div>
              </div>

              <Button type="button" variant="ghost" size="sm" className="mt-3 gap-1" onClick={() => setShowBreakdown(!showBreakdown)}>
                {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Detailed Waste Breakdown
              </Button>

              {showBreakdown && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                  <div><Label className="text-xs">PET Bottles (kg)</Label><Input type="number" min={0} value={form.pet_bottles_kg} onChange={(e) => setForm({ ...form, pet_bottles_kg: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">HDPE (kg)</Label><Input type="number" min={0} value={form.hdpe_kg} onChange={(e) => setForm({ ...form, hdpe_kg: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Fishing Nets (kg)</Label><Input type="number" min={0} value={form.fishing_nets_kg} onChange={(e) => setForm({ ...form, fishing_nets_kg: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Sachets (kg)</Label><Input type="number" min={0} value={form.sachets_kg} onChange={(e) => setForm({ ...form, sachets_kg: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Glass (kg)</Label><Input type="number" min={0} value={form.glass_kg} onChange={(e) => setForm({ ...form, glass_kg: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Metal (kg)</Label><Input type="number" min={0} value={form.metal_kg} onChange={(e) => setForm({ ...form, metal_kg: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Other (kg)</Label><Input type="number" min={0} value={form.other_materials_kg} onChange={(e) => setForm({ ...form, other_materials_kg: Number(e.target.value) })} /></div>
                </div>
              )}
            </div>

            <Separator />

            {/* Logistics */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Logistics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Waste Transported To</Label><Input value={form.waste_destination} onChange={(e) => setForm({ ...form, waste_destination: e.target.value })} placeholder="Recycling center / landfill" /></div>
                <div><Label>Transport Method</Label><Input value={form.transport_method} onChange={(e) => setForm({ ...form, transport_method: e.target.value })} placeholder="e.g. Truck, Handcart" /></div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Switch checked={form.waste_sorted} onCheckedChange={(v) => setForm({ ...form, waste_sorted: v })} />
                <Label>Waste Sorting Done</Label>
              </div>
            </div>

            <Separator />

            {/* Photos */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Media Upload</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PhotoUpload category="before" photos={beforePhotos} label="Before Photos" />
                <PhotoUpload category="during" photos={duringPhotos} label="During Cleanup" />
                <PhotoUpload category="after" photos={afterPhotos} label="After Photos" />
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Notes & Observations</h4>
              <div className="space-y-3">
                <div><Label>Observations</Label><Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="What did you observe during the cleanup?" /></div>
                <div><Label>Environmental Issues</Label><Textarea value={form.environmental_issues} onChange={(e) => setForm({ ...form, environmental_issues: e.target.value })} placeholder="Any environmental concerns noticed?" /></div>
                <div><Label>Recommendations</Label><Textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} placeholder="Suggestions for future cleanups" /></div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  if (!form.title || !form.location_name) {
                    toast.error("Please fill in the title and location");
                    return;
                  }
                  createMutation.mutate({
                    ...form,
                    lead_organizer: form.lead_organizer || profile?.full_name || "",
                  });
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Cleanup
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : cleanups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No cleanup exercises logged yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cleanups.map((c) => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground truncate">{c.title}</h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {LOCATION_TYPES.find((l) => l.value === c.location_type)?.label || c.location_type}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{format(new Date(c.cleanup_date), "PPP")}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location_name}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.num_volunteers + c.num_waste_pickers} participants</span>
                      <span className="font-medium text-foreground">{Number(c.total_waste_kg).toLocaleString()} kg</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setViewCleanup(c)} title="View Report"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => generatePDF(c)} title="Download PDF"><Download className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => exportCSV(c)} title="Export CSV"><FileText className="w-4 h-4" /></Button>
                    {!isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)} title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Report Dialog */}
      <Dialog open={!!viewCleanup} onOpenChange={() => setViewCleanup(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewCleanup && (
            <>
              <DialogHeader>
                <DialogTitle>{viewCleanup.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Date:</span> {format(new Date(viewCleanup.cleanup_date), "PPP")}</div>
                  <div><span className="text-muted-foreground">Time:</span> {viewCleanup.start_time} - {viewCleanup.end_time}</div>
                  <div><span className="text-muted-foreground">Location:</span> {viewCleanup.location_name}</div>
                  <div><span className="text-muted-foreground">Type:</span> {LOCATION_TYPES.find((l) => l.value === viewCleanup.location_type)?.label}</div>
                  <div><span className="text-muted-foreground">Organizer:</span> {viewCleanup.lead_organizer}</div>
                  {viewCleanup.location_lat && <div><span className="text-muted-foreground">GPS:</span> {viewCleanup.location_lat}, {viewCleanup.location_lng}</div>}
                </div>

                <Separator />
                <h4 className="font-semibold text-foreground">Participation</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><span className="text-muted-foreground">Volunteers:</span> {viewCleanup.num_volunteers}</div>
                  <div><span className="text-muted-foreground">Waste Pickers:</span> {viewCleanup.num_waste_pickers}</div>
                  <div><span className="text-muted-foreground">Partners:</span> {viewCleanup.num_partner_orgs}</div>
                </div>

                <Separator />
                <h4 className="font-semibold text-foreground">Waste Collection</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{Number(viewCleanup.total_waste_kg).toLocaleString()} kg</span></div>
                  <div><span className="text-muted-foreground">Plastic:</span> {Number(viewCleanup.plastic_waste_kg).toLocaleString()} kg</div>
                  <div><span className="text-muted-foreground">Recyclable:</span> {Number(viewCleanup.recyclable_waste_kg).toLocaleString()} kg</div>
                  <div><span className="text-muted-foreground">Non-Recyclable:</span> {Number(viewCleanup.non_recyclable_waste_kg).toLocaleString()} kg</div>
                  <div><span className="text-muted-foreground">Bags:</span> {viewCleanup.num_bags}</div>
                </div>

                {(viewCleanup.pet_bottles_kg > 0 || viewCleanup.hdpe_kg > 0 || viewCleanup.fishing_nets_kg > 0) && (
                  <>
                    <h5 className="text-xs font-semibold text-muted-foreground mt-2">Breakdown</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {viewCleanup.pet_bottles_kg > 0 && <div>PET: {viewCleanup.pet_bottles_kg} kg</div>}
                      {viewCleanup.hdpe_kg > 0 && <div>HDPE: {viewCleanup.hdpe_kg} kg</div>}
                      {viewCleanup.fishing_nets_kg > 0 && <div>Fishing Nets: {viewCleanup.fishing_nets_kg} kg</div>}
                      {viewCleanup.sachets_kg > 0 && <div>Sachets: {viewCleanup.sachets_kg} kg</div>}
                      {viewCleanup.glass_kg > 0 && <div>Glass: {viewCleanup.glass_kg} kg</div>}
                      {viewCleanup.metal_kg > 0 && <div>Metal: {viewCleanup.metal_kg} kg</div>}
                      {viewCleanup.other_materials_kg > 0 && <div>Other: {viewCleanup.other_materials_kg} kg</div>}
                    </div>
                  </>
                )}

                <Separator />
                <h4 className="font-semibold text-foreground">Logistics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Destination:</span> {viewCleanup.waste_destination || "N/A"}</div>
                  <div><span className="text-muted-foreground">Transport:</span> {viewCleanup.transport_method || "N/A"}</div>
                  <div><span className="text-muted-foreground">Sorted:</span> {viewCleanup.waste_sorted ? "Yes" : "No"}</div>
                </div>

                {/* Photos */}
                {[...viewCleanup.before_photos, ...viewCleanup.during_photos, ...viewCleanup.after_photos].length > 0 && (
                  <>
                    <Separator />
                    <h4 className="font-semibold text-foreground">Photos</h4>
                    {viewCleanup.before_photos.length > 0 && (
                      <div><p className="text-xs text-muted-foreground mb-1">Before</p><div className="flex flex-wrap gap-2">{viewCleanup.before_photos.map((url, i) => <img key={i} src={url} alt="Before" className="w-24 h-24 object-cover rounded-md border border-border" />)}</div></div>
                    )}
                    {viewCleanup.during_photos.length > 0 && (
                      <div><p className="text-xs text-muted-foreground mb-1">During</p><div className="flex flex-wrap gap-2">{viewCleanup.during_photos.map((url, i) => <img key={i} src={url} alt="During" className="w-24 h-24 object-cover rounded-md border border-border" />)}</div></div>
                    )}
                    {viewCleanup.after_photos.length > 0 && (
                      <div><p className="text-xs text-muted-foreground mb-1">After</p><div className="flex flex-wrap gap-2">{viewCleanup.after_photos.map((url, i) => <img key={i} src={url} alt="After" className="w-24 h-24 object-cover rounded-md border border-border" />)}</div></div>
                    )}
                  </>
                )}

                {/* Notes */}
                {(viewCleanup.observations || viewCleanup.environmental_issues || viewCleanup.recommendations) && (
                  <>
                    <Separator />
                    <h4 className="font-semibold text-foreground">Notes</h4>
                    {viewCleanup.observations && <div><span className="text-muted-foreground">Observations:</span><p className="mt-1">{viewCleanup.observations}</p></div>}
                    {viewCleanup.environmental_issues && <div><span className="text-muted-foreground">Environmental Issues:</span><p className="mt-1">{viewCleanup.environmental_issues}</p></div>}
                    {viewCleanup.recommendations && <div><span className="text-muted-foreground">Recommendations:</span><p className="mt-1">{viewCleanup.recommendations}</p></div>}
                  </>
                )}

                <div className="flex gap-2 pt-3">
                  <Button size="sm" onClick={() => generatePDF(viewCleanup)} className="gap-1"><Download className="w-3 h-3" /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => exportCSV(viewCleanup)} className="gap-1"><FileText className="w-3 h-3" /> CSV</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CleanupExercisePanel;
