import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { encodeImageForUpload } from "@/lib/imageEncoder";

const categories = [
  { value: "raw_material", label: "Raw Material" },
  { value: "recycled_product", label: "Recycled Product" },
  { value: "equipment", label: "Equipment" },
  { value: "service", label: "Service" },
];

const conditions = [
  { value: "bulk", label: "Bulk" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
];

const statuses = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "sold", label: "Sold" },
];

interface EditListingDialogProps {
  listing: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditListingDialog({ listing, open, onOpenChange }: EditListingDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "raw_material",
    material_type: "",
    quantity: "",
    unit: "kg",
    price_per_unit: "",
    location: "",
    county: "",
    contact_phone: "",
    contact_email: "",
    condition: "bulk",
    status: "active",
  });

  useEffect(() => {
    if (listing) {
      setForm({
        title: listing.title || "",
        description: listing.description || "",
        category: listing.category || "raw_material",
        material_type: listing.material_type || "",
        quantity: String(listing.quantity || ""),
        unit: listing.unit || "kg",
        price_per_unit: String(listing.price_per_unit || ""),
        location: listing.location || "",
        county: listing.county || "",
        contact_phone: listing.contact_phone || "",
        contact_email: listing.contact_email || "",
        condition: listing.condition || "bulk",
        status: listing.status || "active",
      });
    }
  }, [listing]);

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("marketplace_listings").update({
        title: form.title,
        description: form.description || null,
        category: form.category,
        material_type: form.material_type || null,
        quantity: parseFloat(form.quantity) || 0,
        unit: form.unit,
        price_per_unit: parseFloat(form.price_per_unit) || 0,
        location: form.location || null,
        county: form.county || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        condition: form.condition,
        status: form.status,
      }).eq("id", listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Listing updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["marketplace_listings"] });
      queryClient.invalidateQueries({ queryKey: ["admin_all_marketplace_listings"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => handleChange("title", e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => handleChange("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Material Type</Label>
            <Input value={form.material_type} onChange={e => handleChange("material_type", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={e => handleChange("quantity", e.target.value)} />
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
              <Label>Price (KES)</Label>
              <Input type="number" value={form.price_per_unit} onChange={e => handleChange("price_per_unit", e.target.value)} />
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
              <Input value={form.location} onChange={e => handleChange("location", e.target.value)} />
            </div>
            <div>
              <Label>County</Label>
              <Input value={form.county} onChange={e => handleChange("county", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.contact_phone} onChange={e => handleChange("contact_phone", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.contact_email} onChange={e => handleChange("contact_email", e.target.value)} />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => updateMutation.mutate()}
            disabled={!form.title || updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
