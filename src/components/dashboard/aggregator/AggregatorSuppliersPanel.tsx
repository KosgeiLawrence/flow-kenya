import { useState } from "react";
import { getDisplayName } from "@/lib/displayUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrash } from "@/hooks/useTrash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Edit2, Trash2, Phone, Mail, MapPin, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface SupplierForm {
  supplier_name: string;
  contact_person: string;
  phone: string;
  email: string;
  location: string;
  material_types: string;
  payment_terms: string;
  notes: string;
  category: string;
  platform_user_id: string;
  platform_role: string;
}

const emptyForm: SupplierForm = {
  supplier_name: "", contact_person: "", phone: "", email: "", location: "",
  material_types: "", payment_terms: "", notes: "", category: "general",
  platform_user_id: "", platform_role: "",
};

const AggregatorSuppliersPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [addMode, setAddMode] = useState<"manual" | "platform">("manual");
  const [platformSearch, setPlatformSearch] = useState("");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch waste pickers from the platform
  const { data: platformWastePickers } = useQuery({
    queryKey: ["platform_waste_pickers_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone_number, email, county, area_of_operation, organization_id, organizations(name)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user && dialogOpen && addMode === "platform",
  });

  const filteredPlatformUsers = platformWastePickers?.filter((p) =>
    getDisplayName(p).toLowerCase().includes(platformSearch.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(platformSearch.toLowerCase()) ||
    p.email?.toLowerCase().includes(platformSearch.toLowerCase()) ||
    p.county?.toLowerCase().includes(platformSearch.toLowerCase())
  ) || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        supplier_name: form.supplier_name,
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        email: form.email || null,
        location: form.location || null,
        material_types: form.material_types ? form.material_types.split(",").map((s) => s.trim()) : [],
        payment_terms: form.payment_terms || null,
        notes: form.notes || null,
        category: form.category,
        platform_user_id: form.platform_user_id || null,
        platform_role: form.platform_role || null,
      };
      if (editId) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(editId ? "Supplier updated" : "Supplier added");
      setDialogOpen(false);
      setForm(emptyForm);
      setEditId(null);
      setAddMode("manual");
    },
    onError: () => toast.error("Failed to save supplier"),
  });

  const { softDelete } = useTrash();
  const handleDeleteSupplier = async (s: any) => {
    const success = await softDelete("suppliers", s.id, s, s.supplier_name);
    if (success) queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  };

  const openEdit = (s: any) => {
    setForm({
      supplier_name: s.supplier_name,
      contact_person: s.contact_person || "",
      phone: s.phone || "",
      email: s.email || "",
      location: s.location || "",
      material_types: (s.material_types || []).join(", "),
      payment_terms: s.payment_terms || "",
      notes: s.notes || "",
      category: s.category || "general",
      platform_user_id: s.platform_user_id || "",
      platform_role: s.platform_role || "",
    });
    setEditId(s.id);
    setAddMode("manual");
    setDialogOpen(true);
  };

  const selectPlatformUser = (p: any) => {
    const displayName = getDisplayName(p);
    setForm({
      ...form,
      supplier_name: displayName,
      contact_person: p.full_name,
      phone: p.phone_number || "",
      email: p.email || "",
      location: p.county || p.area_of_operation || "",
      platform_user_id: p.user_id,
      platform_role: "waste_picker",
    });
    setAddMode("manual");
  };

  const filtered = suppliers?.filter((s) =>
    s.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const categoryColors: Record<string, "default" | "secondary" | "destructive"> = {
    general: "secondary",
    preferred: "default",
    new: "secondary",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{suppliers?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Suppliers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <UserPlus className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{suppliers?.filter((s) => s.platform_user_id).length || 0}</p>
              <p className="text-xs text-muted-foreground">Platform Pickers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{suppliers?.filter((s) => s.category === "preferred").length || 0}</p>
              <p className="text-xs text-muted-foreground">Preferred</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); setAddMode("manual"); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Supplier</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4">
            <DialogHeader><DialogTitle className="text-base">{editId ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>

            {!editId && (
              <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "manual" | "platform")} className="mb-2">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="manual" className="text-xs">Manual Entry</TabsTrigger>
                  <TabsTrigger value="platform" className="text-xs">From Waste Pickers</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {addMode === "platform" && !editId && (
              <div className="space-y-2 mb-3">
                <Input placeholder="Search waste pickers..." value={platformSearch} onChange={(e) => setPlatformSearch(e.target.value)} className="h-8 text-sm" />
                <div className="max-h-40 overflow-y-auto border rounded-md divide-y divide-border">
                  {filteredPlatformUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">No waste pickers found</p>
                  ) : (
                    filteredPlatformUsers.slice(0, 20).map((p) => (
                      <button key={p.id} onClick={() => selectPlatformUser(p)} className="w-full text-left p-2 hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-foreground">{getDisplayName(p)}</p>
                        <p className="text-xs text-muted-foreground">
                          {(p as any).organizations?.name ? p.full_name + " · " : ""}{p.county || p.area_of_operation || ""}
                          {p.phone_number ? ` · ${p.phone_number}` : ""}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div><Label className="text-xs">Supplier Name *</Label><Input className="h-8 text-sm" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="e.g. John Ochieng" /></div>
              <div><Label className="text-xs">Contact Person</Label><Input className="h-8 text-sm" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Full name" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Phone</Label><Input className="h-8 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0712..." /></div>
                <div><Label className="text-xs">Email</Label><Input className="h-8 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@..." /></div>
              </div>
              <div><Label className="text-xs">Location</Label><Input className="h-8 text-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="County / area" /></div>
              <div><Label className="text-xs">Materials Supplied</Label><Input className="h-8 text-sm" value={form.material_types} onChange={(e) => setForm({ ...form, material_types: e.target.value })} placeholder="PET, HDPE, Glass (comma-separated)" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="preferred">Preferred</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Payment Terms</Label><Input className="h-8 text-sm" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="e.g. Cash on delivery" /></div>
              </div>
              <div><Label className="text-xs">Notes</Label><Textarea className="text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={1} placeholder="Additional info..." /></div>
              <Button className="w-full h-8 text-sm" onClick={() => saveMutation.mutate()} disabled={!form.supplier_name || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editId ? "Update Supplier" : "Add Supplier"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Supplier Directory</CardTitle></CardHeader>
        <CardContent>
          {!filtered.length ? (
            <p className="text-sm text-muted-foreground">No suppliers yet. Add your first supplier above.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((s) => (
                <div key={s.id} className="py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{s.supplier_name}</p>
                        <Badge variant={categoryColors[s.category] || "secondary"} className="text-[10px]">{s.category}</Badge>
                        {s.platform_user_id && <Badge variant="default" className="text-[10px]">Waste Picker</Badge>}
                      </div>
                      {s.contact_person && <p className="text-xs text-muted-foreground mt-0.5">{s.contact_person}</p>}
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                        {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                        {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                        {s.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>}
                      </div>
                      {s.material_types && (s.material_types as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(s.material_types as string[]).map((m, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] font-normal">{m}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Orders: {s.total_orders}</span>
                        <span>Spent: KES {Number(s.total_spent).toLocaleString()}</span>
                        {s.payment_terms && <span>Terms: {s.payment_terms}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSupplier(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AggregatorSuppliersPanel;
