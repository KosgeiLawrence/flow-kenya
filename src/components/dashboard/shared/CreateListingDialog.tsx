import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Upload, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { encodeImageForUpload } from "@/lib/imageEncoder";

const categories = [
  { value: "raw_material", label: "Raw Material (e.g. PET bottles, HDPE, scrap metal)" },
  { value: "recycled_product", label: "Recycled Product (e.g. pellets, flakes, boards)" },
  { value: "equipment", label: "Equipment (e.g. baling machine, shredder)" },
  { value: "service", label: "Service (e.g. collection, sorting, transport)" },
];

const conditions = [
  { value: "bulk", label: "Bulk" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
];

interface Props {
  sellerRole: string;
}

export default function CreateListingDialog({ sellerRole }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "raw_material",
    material_type: "",
    quantity: "",
    unit: "kg",
    price_per_unit: "",
    location: profile?.physical_address || "",
    county: profile?.county || "",
    contact_phone: profile?.phone_number || "",
    contact_email: profile?.email || "",
    condition: "bulk",
  });

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const original of Array.from(files).slice(0, 5 - images.length)) {
        const file = await encodeImageForUpload(original);
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("marketplace-images").upload(path, file, {
          contentType: file.type,
        });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("marketplace-images").getPublicUrl(path);
        setImages(prev => [...prev, urlData.publicUrl]);
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("marketplace_listings").insert({
        seller_user_id: user.id,
        seller_role: sellerRole,
        title: form.title,
        description: form.description || null,
        category: form.category,
        material_type: form.material_type || null,
        quantity: parseFloat(form.quantity) || 0,
        unit: form.unit,
        price_per_unit: parseFloat(form.price_per_unit) || 0,
        images,
        location: form.location || null,
        county: form.county || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        condition: form.condition,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Listing created!", description: "Your item is now visible on the marketplace." });
      queryClient.invalidateQueries({ queryKey: ["marketplace_listings"] });
      setOpen(false);
      setForm({ title: "", description: "", category: "raw_material", material_type: "", quantity: "", unit: "kg", price_per_unit: "", location: profile?.physical_address || "", county: profile?.county || "", contact_phone: profile?.phone_number || "", contact_email: profile?.email || "", condition: "bulk" });
      setImages([]);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const defaultMaterialSuggestions = sellerRole === "waste_picker"
    ? ["PET Bottles", "HDPE Containers", "Cardboard", "Scrap Metal", "Glass", "Sachets", "Mixed Plastics"]
    : sellerRole === "aggregator"
    ? ["Sorted PET", "Baled HDPE", "Sorted Cardboard", "Mixed Metals", "Clean Glass"]
    : ["PET Flakes", "HDPE Pellets", "Recycled Lumber", "Recycled Boards", "Compost"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Post Listing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input placeholder="e.g. 500kg Clean PET Bottles" value={form.title} onChange={e => handleChange("title", e.target.value)} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea placeholder="Describe quality, origin, and any other details..." value={form.description} onChange={e => handleChange("description", e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => handleChange("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material Type</Label>
              <Select value={form.material_type} onValueChange={v => handleChange("material_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {defaultMaterialSuggestions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Quantity *</Label>
              <Input type="number" placeholder="500" value={form.quantity} onChange={e => handleChange("quantity", e.target.value)} />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={v => handleChange("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="tonnes">tonnes</SelectItem>
                  <SelectItem value="pieces">pieces</SelectItem>
                  <SelectItem value="bales">bales</SelectItem>
                  <SelectItem value="bags">bags</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price (KES) *</Label>
              <Input type="number" placeholder="25" value={form.price_per_unit} onChange={e => handleChange("price_per_unit", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Condition</Label>
            <Select value={form.condition} onValueChange={v => handleChange("condition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {conditions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Location</Label>
              <Input placeholder="e.g. Changamwe" value={form.location} onChange={e => handleChange("location", e.target.value)} />
            </div>
            <div>
              <Label>County</Label>
              <Input placeholder="e.g. Mombasa" value={form.county} onChange={e => handleChange("county", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input placeholder="+254..." value={form.contact_phone} onChange={e => handleChange("contact_phone", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input placeholder="you@email.com" value={form.contact_email} onChange={e => handleChange("contact_email", e.target.value)} />
            </div>
          </div>

          {/* Images */}
          <div>
            <Label>Photos (up to 5)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {images.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-black/60 rounded-bl p-0.5">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={!form.title || !form.quantity || !form.price_per_unit || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Publish Listing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
