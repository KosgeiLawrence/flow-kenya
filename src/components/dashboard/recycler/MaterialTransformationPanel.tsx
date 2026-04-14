import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Recycle, ArrowRight, Plus, History, BarChart3, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const TRANSFORMATION_TYPES = [
  { value: "recycling", label: "♻️ Recycling" },
  { value: "upcycling", label: "⬆️ Upcycling" },
  { value: "composting", label: "🌱 Composting" },
  { value: "shredding", label: "🔧 Shredding" },
  { value: "melting", label: "🔥 Melting" },
  { value: "other", label: "📦 Other" },
];

const MaterialTransformationPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [inputMaterialId, setInputMaterialId] = useState("");
  const [inputQty, setInputQty] = useState("");
  const [outputName, setOutputName] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [outputUnit, setOutputUnit] = useState("kg");
  const [transformType, setTransformType] = useState("recycling");
  const [notes, setNotes] = useState("");
  const [linkToProduct, setLinkToProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");

  const { data: materialTypes } = useQuery({
    queryKey: ["material_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: inventory } = useQuery({
    queryKey: ["recycler_inventory_for_transform", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit, icon)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      // Aggregate by material type
      const map = new Map<string, { id: string; name: string; qty: number; unit: string; icon: string }>();
      data?.forEach((c: any) => {
        const mt = c.material_types;
        const key = mt?.name || c.material_type_id;
        const existing = map.get(key);
        const qty = Number(c.quantity);
        if (existing) {
          existing.qty += qty;
        } else {
          map.set(key, { id: c.material_type_id, name: mt?.name || "Unknown", qty, unit: mt?.unit || "kg", icon: mt?.icon || "♻️" });
        }
      });
      return Array.from(map.values());
    },
    enabled: !!user,
  });

  const { data: products } = useQuery({
    queryKey: ["recycler_products_for_transform", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recycler_products")
        .select("*")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transformations } = useQuery({
    queryKey: ["material_transformations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_transformations" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("transformation_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: transformInputs } = useQuery({
    queryKey: ["transformation_inputs", user?.id],
    queryFn: async () => {
      const ids = transformations?.map((t: any) => t.id) || [];
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("transformation_inputs" as any)
        .select("*")
        .in("transformation_id", ids);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!transformations?.length,
  });

  const { data: transformOutputs } = useQuery({
    queryKey: ["transformation_outputs", user?.id],
    queryFn: async () => {
      const ids = transformations?.map((t: any) => t.id) || [];
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("transformation_outputs" as any)
        .select("*")
        .in("transformation_id", ids);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!transformations?.length,
  });

  const createTransformation = useMutation({
    mutationFn: async () => {
      const selectedMaterial = inventory?.find(m => m.id === inputMaterialId);
      if (!selectedMaterial) throw new Error("Select input material");
      const inQty = Number(inputQty);
      const outQty = Number(outputQty);
      if (inQty <= 0 || outQty <= 0) throw new Error("Quantities must be positive");
      if (inQty > selectedMaterial.qty) throw new Error("Insufficient stock");

      const yieldPct = (outQty / inQty) * 100;

      // 1. Create transformation record
      const { data: trans, error: transErr } = await supabase
        .from("material_transformations" as any)
        .insert({ user_id: user!.id, transformation_type: transformType, notes, yield_percentage: yieldPct } as any)
        .select()
        .single();
      if (transErr) throw transErr;

      const transId = (trans as any).id;

      // 2. Log input
      const { error: inErr } = await supabase
        .from("transformation_inputs" as any)
        .insert({ transformation_id: transId, material_name: selectedMaterial.name, material_type_id: inputMaterialId, quantity: inQty, unit: selectedMaterial.unit } as any);
      if (inErr) throw inErr;

      // 3. Log output
      const { error: outErr } = await supabase
        .from("transformation_outputs" as any)
        .insert({ transformation_id: transId, product_name: outputName, product_id: linkToProduct && selectedProductId ? selectedProductId : null, quantity: outQty, unit: outputUnit } as any);
      if (outErr) throw outErr;

      // 4. Deduct from raw inventory - insert negative collection
      const { error: deductErr } = await supabase.from("collections").insert({
        user_id: user!.id,
        material_type_id: inputMaterialId,
        quantity: -inQty,
        notes: `Transformation: ${outputName} (${transformType})`,
      });
      if (deductErr) throw deductErr;

      // 5. Update or create product
      if (linkToProduct && selectedProductId) {
        const product = products?.find(p => p.id === selectedProductId);
        if (product) {
          await supabase.from("recycler_products").update({
            stock_quantity: Number(product.stock_quantity) + outQty,
          }).eq("id", selectedProductId);
        }
      } else {
        await supabase.from("recycler_products").insert({
          user_id: user!.id,
          name: outputName,
          stock_quantity: outQty,
          unit: outputUnit,
          price_per_unit: 0,
          material_source: `Recycled from ${selectedMaterial.name}`,
          description: `Produced via ${transformType}`,
          status: "available",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_transformations"] });
      queryClient.invalidateQueries({ queryKey: ["transformation_inputs"] });
      queryClient.invalidateQueries({ queryKey: ["transformation_outputs"] });
      queryClient.invalidateQueries({ queryKey: ["recycler_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["recycler_inventory_for_transform"] });
      queryClient.invalidateQueries({ queryKey: ["recycler_products"] });
      queryClient.invalidateQueries({ queryKey: ["recycler_products_for_transform"] });
      setOpen(false);
      resetForm();
      toast.success("Transformation recorded! Stock updated.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setInputMaterialId("");
    setInputQty("");
    setOutputName("");
    setOutputQty("");
    setOutputUnit("kg");
    setTransformType("recycling");
    setNotes("");
    setLinkToProduct(false);
    setSelectedProductId("");
  };

  const selectedMaterial = inventory?.find(m => m.id === inputMaterialId);
  const yieldPreview = inputQty && outputQty ? ((Number(outputQty) / Number(inputQty)) * 100).toFixed(1) : null;

  const totalTransformations = transformations?.length || 0;
  const totalInputKg = transformInputs?.reduce((s: number, i: any) => s + Number(i.quantity), 0) || 0;
  const totalOutputKg = transformOutputs?.reduce((s: number, o: any) => s + Number(o.quantity), 0) || 0;
  const avgYield = totalInputKg > 0 ? ((totalOutputKg / totalInputKg) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Recycle className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{totalTransformations}</p>
              <p className="text-xs text-muted-foreground">Transformations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{totalInputKg.toFixed(0)} kg</p>
              <p className="text-xs text-muted-foreground">Raw Used</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Layers className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{totalOutputKg.toFixed(0)} kg</p>
              <p className="text-xs text-muted-foreground">Products Made</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <BarChart3 className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{avgYield}%</p>
              <p className="text-xs text-muted-foreground">Avg Yield</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Transformation Button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button><Plus className="w-4 h-4 mr-1" /> New Transformation</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Material Transformation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Transformation Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Type</label>
              <Select value={transformType} onValueChange={setTransformType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSFORMATION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input Material */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                <Package className="w-4 h-4" /> Input (Raw Material)
              </p>
              <Select value={inputMaterialId} onValueChange={setInputMaterialId}>
                <SelectTrigger><SelectValue placeholder="Select raw material" /></SelectTrigger>
                <SelectContent>
                  {inventory?.filter(m => m.qty > 0).map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.icon} {m.name} — {m.qty.toFixed(1)} {m.unit} available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder={`Quantity to use (${selectedMaterial?.unit || "kg"})`}
                value={inputQty}
                onChange={e => setInputQty(e.target.value)}
                max={selectedMaterial?.qty}
              />
              {selectedMaterial && inputQty && Number(inputQty) > selectedMaterial.qty && (
                <p className="text-xs text-destructive">Exceeds available stock ({selectedMaterial.qty.toFixed(1)} {selectedMaterial.unit})</p>
              )}
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
            </div>

            {/* Output Product */}
            <div className="p-3 bg-primary/5 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                <Recycle className="w-4 h-4" /> Output (Product)
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={!linkToProduct ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLinkToProduct(false)}
                >
                  New Product
                </Button>
                <Button
                  type="button"
                  variant={linkToProduct ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLinkToProduct(true)}
                >
                  Existing Product
                </Button>
              </div>

              {linkToProduct ? (
                <Select value={selectedProductId} onValueChange={(v) => { setSelectedProductId(v); const p = products?.find(p => p.id === v); if (p) setOutputName(p.name); }}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock_quantity} {p.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="Product name (e.g., Recycled Pellets)" value={outputName} onChange={e => setOutputName(e.target.value)} />
              )}

              <div className="flex gap-2">
                <Input type="number" placeholder="Quantity produced" value={outputQty} onChange={e => setOutputQty(e.target.value)} className="flex-1" />
                <Select value={outputUnit} onValueChange={setOutputUnit}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="units">units</SelectItem>
                    <SelectItem value="litres">litres</SelectItem>
                    <SelectItem value="bags">bags</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Yield Preview */}
            {yieldPreview && (
              <div className="text-center p-2 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Yield: <span className="font-bold text-foreground">{yieldPreview}%</span></p>
                <p className="text-xs text-muted-foreground">{inputQty} {selectedMaterial?.unit || "kg"} → {outputQty} {outputUnit}</p>
              </div>
            )}

            <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

            <Button
              className="w-full"
              onClick={() => createTransformation.mutate()}
              disabled={!inputMaterialId || !inputQty || !outputName || !outputQty || createTransformation.isPending}
            >
              {createTransformation.isPending ? "Processing..." : "Record Transformation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs: History + Inventory Overview */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> History</TabsTrigger>
          <TabsTrigger value="stock"><Package className="w-4 h-4 mr-1" /> Stock Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-lg">Transformation History</CardTitle></CardHeader>
            <CardContent>
              {!transformations?.length ? (
                <p className="text-sm text-muted-foreground">No transformations recorded yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {transformations.map((t: any) => {
                    const inputs = transformInputs?.filter((i: any) => i.transformation_id === t.id) || [];
                    const outputs = transformOutputs?.filter((o: any) => o.transformation_id === t.id) || [];
                    const typeLabel = TRANSFORMATION_TYPES.find(tt => tt.value === t.transformation_type)?.label || t.transformation_type;
                    return (
                      <div key={t.id} className="py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(t.transformation_date), "MMM d, yyyy")}</span>
                          </div>
                          {t.yield_percentage != null && (
                            <Badge variant="outline" className="text-xs">Yield: {Number(t.yield_percentage).toFixed(1)}%</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {inputs.map((i: any) => `${Number(i.quantity).toFixed(1)} ${i.unit} ${i.material_name}`).join(", ")}
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">
                            {outputs.map((o: any) => `${Number(o.quantity).toFixed(1)} ${o.unit} ${o.product_name}`).join(", ")}
                          </span>
                        </div>
                        {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> Raw Materials (Waste)</CardTitle></CardHeader>
              <CardContent>
                {!inventory?.filter(m => m.qty > 0).length ? (
                  <p className="text-sm text-muted-foreground">No raw materials in stock.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {inventory?.filter(m => m.qty > 0).map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-sm">{m.icon} {m.name}</span>
                        <span className="text-sm font-medium">{m.qty.toFixed(1)} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Recycle className="w-4 h-4" /> Finished Products</CardTitle></CardHeader>
              <CardContent>
                {!products?.length ? (
                  <p className="text-sm text-muted-foreground">No products yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {products.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.material_source && <p className="text-xs text-muted-foreground">{p.material_source}</p>}
                        </div>
                        <span className="text-sm font-medium">{Number(p.stock_quantity).toFixed(1)} {p.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaterialTransformationPanel;
