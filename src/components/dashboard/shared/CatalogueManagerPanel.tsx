import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatbotUIAction } from "@/hooks/useChatbotUIAction";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Store, Share2, Copy, Check, ExternalLink, QrCode, Download, Plus,
  Pencil, Trash2, Image as ImageIcon, Eye, Package, Sparkles, Code2, Globe, Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { QRCodeCanvas } from "qrcode.react";

interface Props { role: "waste_picker" | "aggregator" | "recycler" }

const categoryOptions = [
  { value: "raw_material", label: "Raw Material" },
  { value: "recycled_product", label: "Recycled Product" },
  { value: "equipment", label: "Equipment" },
  { value: "service", label: "Service" },
];

export default function CatalogueManagerPanel({ role }: Props) {
  const { user, profile, displayName, orgLogoUrl } = useAuth();
  const qc = useQueryClient();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useChatbotUIAction(["add-catalogue-item"], useCallback(() => setNewItemOpen(true), []));
  useChatbotUIAction(["share-catalogue"], useCallback(() => setShareOpen(true), []));

  // Catalogue
  const { data: catalogue, isLoading } = useQuery({
    queryKey: ["my_catalogue", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalogues")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Items
  const { data: items } = useQuery({
    queryKey: ["catalogue_items", catalogue?.id],
    enabled: !!catalogue?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalogue_items")
        .select("*, marketplace_listings(id, title)")
        .eq("catalogue_id", catalogue!.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Marketplace listings (for import)
  const { data: myListings } = useQuery({
    queryKey: ["my_marketplace_listings_for_import", user?.id],
    enabled: !!user && !!catalogue,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("seller_user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  // Create catalogue
  const createMutation = useMutation({
    mutationFn: async () => {
      const businessName = displayName || profile?.full_name || "My Business";
      const { data: slugRes } = await supabase.rpc("generate_catalogue_slug", { _name: businessName });
      const { data, error } = await supabase
        .from("product_catalogues")
        .insert({
          user_id: user!.id,
          slug: slugRes as string,
          business_name: businessName,
          tagline: "",
          about: "",
          banner_url: orgLogoUrl,
          contact_phone: profile?.phone_number,
          contact_email: profile?.email,
          contact_whatsapp: profile?.phone_number,
          website: profile?.website,
          physical_address: profile?.physical_address,
          county: profile?.county,
          sub_county: profile?.sub_county,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_catalogue", user?.id] });
      toast({ title: "Catalogue created", description: "Customize and start adding products." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("product_catalogues").update(patch).eq("id", catalogue!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_catalogue", user?.id] });
      toast({ title: "Saved" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (listing: any) => {
      const { error } = await supabase.from("product_catalogue_items").insert({
        catalogue_id: catalogue!.id,
        marketplace_listing_id: listing.id,
        title: listing.title,
        description: listing.description,
        category: listing.category,
        material_type: listing.material_type,
        price_per_unit: listing.price_per_unit,
        unit: listing.unit,
        currency: listing.currency,
        quantity: listing.quantity,
        images: listing.images,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogue_items", catalogue?.id] });
      toast({ title: "Imported from marketplace" });
    },
  });

  const publicUrl = useMemo(() => {
    if (!catalogue?.slug) return "";
    return `${window.location.origin}/catalogue/${catalogue.slug}`;
  }, [catalogue?.slug]);

  const embedCode = useMemo(() => {
    if (!publicUrl) return "";
    return `<iframe src="${publicUrl}?embed=1" width="100%" height="900" style="border:0;border-radius:12px" loading="lazy"></iframe>`;
  }, [publicUrl]);

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: "Copied to clipboard" });
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${catalogue?.slug || "catalogue"}-qr.png`;
    a.click();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!catalogue) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold">Create Your Product Catalogue</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Get a branded, shareable storefront link for your business. Add products, share via WhatsApp, embed on your website, and grow your customer base.
            </p>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} size="lg" className="gap-2">
            <Sparkles className="w-4 h-4" /> {createMutation.isPending ? "Creating..." : "Create my catalogue"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold truncate">{catalogue.business_name}</p>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                <Globe className="w-3 h-3" /> {publicUrl.replace(/^https?:\/\//, "")}
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-2">
              <Eye className="w-3.5 h-3.5" /> {catalogue.view_count} views
            </div>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
              <Switch
                checked={catalogue.is_published}
                onCheckedChange={(v) => updateMutation.mutate({ is_published: v })}
              />
              <span className="text-xs">{catalogue.is_published ? "Live" : "Draft"}</span>
            </div>
            <Button variant="outline" onClick={() => window.open(publicUrl, "_blank")} className="gap-2">
              <ExternalLink className="w-4 h-4" /> Preview
            </Button>
            <Button onClick={() => setShareOpen(true)} className="gap-2">
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items"><Package className="w-4 h-4 mr-1.5" />Products ({items?.length || 0})</TabsTrigger>
          <TabsTrigger value="branding"><Sparkles className="w-4 h-4 mr-1.5" />Branding</TabsTrigger>
          <TabsTrigger value="contact"><Globe className="w-4 h-4 mr-1.5" />Business Info</TabsTrigger>
        </TabsList>

        {/* PRODUCTS */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Catalogue Products</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNewItemOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add product
              </Button>
            </div>
          </div>

          {/* Import from marketplace */}
          {(myListings?.length || 0) > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4" />Import from your marketplace listings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {myListings!.map((l) => {
                  const already = items?.some((i) => i.marketplace_listing_id === l.id);
                  return (
                    <div key={l.id} className="flex items-center justify-between p-2 rounded-lg bg-background">
                      <div className="flex items-center gap-2 min-w-0">
                        {l.images?.[0] ? (
                          <img src={l.images[0]} className="w-10 h-10 rounded object-cover" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{l.title}</p>
                          <p className="text-xs text-muted-foreground">KES {l.price_per_unit}/{l.unit}</p>
                        </div>
                      </div>
                      <Button
                        variant={already ? "ghost" : "outline"}
                        size="sm"
                        disabled={already || importMutation.isPending}
                        onClick={() => importMutation.mutate(l)}
                      >
                        {already ? <><Check className="w-3.5 h-3.5 mr-1" />Imported</> : "Import"}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Items list */}
          {!items?.length ? (
            <Card><CardContent className="p-10 text-center">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No products yet. Add your first one or import from marketplace.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item: any) => <ItemCard key={item.id} item={item} onEdit={() => setEditingItem(item)} catalogueId={catalogue.id} />)}
            </div>
          )}
        </TabsContent>

        {/* BRANDING */}
        <TabsContent value="branding">
          <BrandingTab catalogue={catalogue} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
        </TabsContent>

        {/* CONTACT */}
        <TabsContent value="contact">
          <ContactTab catalogue={catalogue} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit item dialog */}
      <ItemDialog
        open={newItemOpen || !!editingItem}
        onOpenChange={(o) => { if (!o) { setNewItemOpen(false); setEditingItem(null); } }}
        item={editingItem}
        catalogueId={catalogue.id}
      />

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Share2 className="w-5 h-5" />Share your catalogue</DialogTitle></DialogHeader>
          <Tabs defaultValue="link" className="space-y-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link"><Globe className="w-4 h-4 mr-1" />Link</TabsTrigger>
              <TabsTrigger value="qr"><QrCode className="w-4 h-4 mr-1" />QR Code</TabsTrigger>
              <TabsTrigger value="embed"><Code2 className="w-4 h-4 mr-1" />Embed</TabsTrigger>
            </TabsList>
            <TabsContent value="link" className="space-y-3">
              <Label className="text-xs">Public link</Label>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly className="text-xs" />
                <Button onClick={() => copyText(publicUrl)} variant="outline" size="icon">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(`Check out my products: ${publicUrl}`)}`} target="_blank" rel="noreferrer">
                  <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">WhatsApp</Button>
                </a>
                <a href={`mailto:?subject=${encodeURIComponent(catalogue.business_name)}&body=${encodeURIComponent(`Check out our catalogue: ${publicUrl}`)}`}>
                  <Button variant="outline" className="w-full">Email</Button>
                </a>
              </div>
            </TabsContent>
            <TabsContent value="qr" className="space-y-3 text-center">
              <div ref={qrRef} className="inline-block p-4 bg-white rounded-xl">
                <QRCodeCanvas value={publicUrl} size={220} level="H" />
              </div>
              <Button onClick={downloadQR} variant="outline" className="gap-2"><Download className="w-4 h-4" />Download PNG</Button>
              <p className="text-xs text-muted-foreground">Print on bins, vehicles, business cards.</p>
            </TabsContent>
            <TabsContent value="embed" className="space-y-3">
              <Label className="text-xs">Embed code (paste into your website HTML)</Label>
              <Textarea value={embedCode} readOnly rows={5} className="text-xs font-mono" />
              <Button onClick={() => copyText(embedCode)} variant="outline" className="gap-2 w-full">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy embed code
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------- ITEM CARD ----------------- */
function ItemCard({ item, onEdit, catalogueId }: { item: any; onEdit: () => void; catalogueId: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_catalogue_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogue_items", catalogueId] });
      toast({ title: "Removed" });
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_catalogue_items").update({ is_visible: !item.is_visible }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogue_items", catalogueId] }),
  });

  return (
    <Card className="overflow-hidden">
      <div className="relative h-32 bg-muted">
        {item.images?.[0] ? (
          <img src={item.images[0]} className="w-full h-full object-cover" alt={item.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground/40" /></div>
        )}
        {item.marketplace_listing_id && (
          <Badge className="absolute top-2 left-2 bg-primary/90 text-[10px]"><Store className="w-3 h-3 mr-1" />Synced</Badge>
        )}
        {!item.is_visible && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">Hidden</Badge>
        )}
      </div>
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.currency} {Number(item.price_per_unit).toLocaleString()}/{item.unit}</p>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={onEdit} className="flex-1 h-8"><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => toggle.mutate()} className="h-8"><Eye className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={() => del.mutate()} className="h-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------- ITEM DIALOG ----------------- */
function ItemDialog({ open, onOpenChange, item, catalogueId }: { open: boolean; onOpenChange: (o: boolean) => void; item: any; catalogueId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm(item || {
      title: "", description: "", category: "recycled_product", material_type: "",
      price_per_unit: 0, unit: "kg", currency: "KES", quantity: 0, images: [],
    });
  }, [item, open]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("marketplace-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("marketplace-images").getPublicUrl(path);
      setForm((f: any) => ({ ...f, images: [...(f.images || []), publicUrl] }));
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        catalogue_id: catalogueId,
        title: form.title,
        description: form.description,
        category: form.category,
        material_type: form.material_type,
        price_per_unit: Number(form.price_per_unit) || 0,
        unit: form.unit,
        currency: form.currency,
        quantity: Number(form.quantity) || 0,
        images: form.images || [],
      };
      if (item?.id) {
        const { error } = await supabase.from("product_catalogue_items").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_catalogue_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogue_items", catalogueId] });
      toast({ title: item ? "Product updated" : "Product added" });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material</Label>
              <Input value={form.material_type || ""} onChange={(e) => setForm({ ...form, material_type: e.target.value })} placeholder="e.g. PET" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Price</Label>
              <Input type="number" value={form.price_per_unit || 0} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit || "kg"} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity || 0} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Images</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(form.images || []).map((url: string, i: number) => (
                <div key={i} className="relative w-20 h-20 rounded overflow-hidden border">
                  <img src={url} className="w-full h-full object-cover" alt="" />
                  <button onClick={() => setForm({ ...form, images: form.images.filter((_: any, j: number) => j !== i) })}
                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl px-1 text-xs">×</button>
                </div>
              ))}
              <label className="w-20 h-20 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- BRANDING TAB ----------------- */
function BrandingTab({ catalogue, onSave, saving }: { catalogue: any; onSave: (p: any) => void; saving: boolean }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    business_name: catalogue.business_name,
    tagline: catalogue.tagline || "",
    about: catalogue.about || "",
    banner_url: catalogue.banner_url || "",
    logo_url: catalogue.logo_url || "",
    theme_color: catalogue.theme_color || "#2b5e3f",
    slug: catalogue.slug,
  });
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);

  const uploadImage = async (file: File, kind: "logo" | "banner") => {
    setUploading(kind);
    try {
      const path = `${user!.id}/${kind}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("marketplace-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("marketplace-images").getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === "logo" ? "logo_url" : "banner_url"]: publicUrl }));
      toast({ title: `${kind === "logo" ? "Logo" : "Banner"} uploaded` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploading(null); }
  };

  return (
    <Card><CardContent className="p-5 space-y-4">
      <div>
        <Label>Business name</Label>
        <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
      </div>
      <div>
        <Label>URL slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">/catalogue/</span>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
        </div>
      </div>
      <div>
        <Label>Tagline</Label>
        <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Quality recycled plastics for industry" />
      </div>
      <div>
        <Label>About your business</Label>
        <Textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={4} placeholder="Tell customers what you do, your mission, what makes you different..." />
      </div>
      <div>
        <Label>Brand color</Label>
        <div className="flex items-center gap-2">
          <input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="w-12 h-10 rounded border cursor-pointer" />
          <Input value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="font-mono text-xs" />
        </div>
      </div>
      <div>
        <Label>Logo</Label>
        <p className="text-xs text-muted-foreground mb-2">Square image shown as your storefront avatar (overrides organization logo).</p>
        <div className="flex items-center gap-3">
          {form.logo_url ? (
            <img src={form.logo_url} className="w-20 h-20 object-cover rounded-xl border" alt="Catalogue logo" />
          ) : (
            <div className="w-20 h-20 rounded-xl border border-dashed flex items-center justify-center bg-muted/30">
              <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "logo")} />
              <Button variant="outline" size="sm" type="button" asChild>
                <span>{uploading === "logo" ? "Uploading..." : form.logo_url ? "Replace logo" : "Upload logo"}</span>
              </Button>
            </label>
            {form.logo_url && (
              <Button variant="ghost" size="sm" type="button" onClick={() => setForm({ ...form, logo_url: "" })} className="text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <div>
        <Label>Banner image</Label>
        <p className="text-xs text-muted-foreground mb-2">Wide background image shown behind your storefront hero.</p>
        <div className="flex items-center gap-3">
          {form.banner_url && <img src={form.banner_url} className="w-32 h-20 object-cover rounded border" alt="Banner" />}
          <label className="cursor-pointer">
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "banner")} />
            <Button variant="outline" size="sm" type="button" asChild>
              <span>{uploading === "banner" ? "Uploading..." : form.banner_url ? "Replace banner" : "Upload banner"}</span>
            </Button>
          </label>
        </div>
      </div>
      <Button onClick={() => onSave(form)} disabled={saving || !!uploading} className="w-full">{saving ? "Saving..." : "Save branding"}</Button>
    </CardContent></Card>
  );
}

/* ----------------- CONTACT TAB ----------------- */
function ContactTab({ catalogue, onSave, saving }: { catalogue: any; onSave: (p: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    contact_phone: catalogue.contact_phone || "",
    contact_email: catalogue.contact_email || "",
    contact_whatsapp: catalogue.contact_whatsapp || "",
    website: catalogue.website || "",
    physical_address: catalogue.physical_address || "",
    county: catalogue.county || "",
    sub_county: catalogue.sub_county || "",
  });

  return (
    <Card><CardContent className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
        <div><Label>WhatsApp</Label><Input value={form.contact_whatsapp} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} /></div>
        <div><Label>Email</Label><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
        <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
      </div>
      <div><Label>Physical address</Label><Input value={form.physical_address} onChange={(e) => setForm({ ...form, physical_address: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>County</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>
        <div><Label>Sub-county</Label><Input value={form.sub_county} onChange={(e) => setForm({ ...form, sub_county: e.target.value })} /></div>
      </div>
      <Button onClick={() => onSave(form)} disabled={saving} className="w-full">{saving ? "Saving..." : "Save contact info"}</Button>
    </CardContent></Card>
  );
}
