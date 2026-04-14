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
import { Package, Layers, TrendingUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const InventoryPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ material_type_id: "", quantity: "", location_name: "" });

  const { data: materialTypes } = useQuery({
    queryKey: ["material_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: collections } = useQuery({
    queryKey: ["aggregator_inventory", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit, icon)")
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collections").insert({
        user_id: user!.id,
        material_type_id: form.material_type_id,
        quantity: Number(form.quantity),
        location_name: form.location_name || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_inventory"] });
      setOpen(false);
      setForm({ material_type_id: "", quantity: "", location_name: "" });
      toast.success("Collection entry added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Aggregate by batch
  const batchMap = new Map<string, { items: typeof collections; total: number }>();
  collections?.forEach((c) => {
    const batch = batchMap.get(c.batch_id) || { items: [], total: 0 };
    batch.items!.push(c);
    const mt = (c as any).material_types;
    batch.total += Number(c.quantity) * Number(mt?.price_per_unit || 0);
    batchMap.set(c.batch_id, batch);
  });

  // Aggregate by material
  const materialMap = new Map<string, { name: string; qty: number; unit: string; value: number }>();
  collections?.forEach((c) => {
    const mt = (c as any).material_types;
    const key = c.material_type_id;
    const existing = materialMap.get(key);
    if (existing) {
      existing.qty += Number(c.quantity);
      existing.value += Number(c.quantity) * Number(mt?.price_per_unit || 0);
    } else {
      materialMap.set(key, {
        name: mt?.name || "Unknown",
        qty: Number(c.quantity),
        unit: mt?.unit || "kg",
        value: Number(c.quantity) * Number(mt?.price_per_unit || 0),
      });
    }
  });

  const totalValue = Array.from(materialMap.values()).reduce((s, m) => s + m.value, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{collections?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Layers className="w-8 h-8 text-accent" />
            <div>
              <p className="text-2xl font-bold text-foreground">{batchMap.size}</p>
              <p className="text-xs text-muted-foreground">Batches</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">KES {totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Inventory Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Collection Entry */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button><Plus className="w-4 h-4 mr-1" /> Add Collection</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Material Collection</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.material_type_id} onValueChange={(v) => setForm({ ...form, material_type_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select material type" /></SelectTrigger>
              <SelectContent>
                {materialTypes?.map((mt) => (
                  <SelectItem key={mt.id} value={mt.id}>{mt.icon || "♻️"} {mt.name} (KES {mt.price_per_unit}/{mt.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Quantity (kg)"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <Input
              placeholder="Collection location (optional)"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            />
            <Button
              className="w-full"
              onClick={() => addEntry.mutate()}
              disabled={!form.material_type_id || !form.quantity || addEntry.isPending}
            >
              {addEntry.isPending ? "Adding..." : "Add to Inventory"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material breakdown */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Material Inventory</CardTitle></CardHeader>
        <CardContent>
          {!materialMap.size ? (
            <p className="text-sm text-muted-foreground">No inventory data.</p>
          ) : (
            <div className="divide-y divide-border">
              {Array.from(materialMap.values()).map((m, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.qty.toFixed(1)} {m.unit}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">KES {m.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent batches */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Recent Batches</CardTitle></CardHeader>
        <CardContent>
          {!batchMap.size ? (
            <p className="text-sm text-muted-foreground">No batches yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {Array.from(batchMap.entries()).slice(0, 10).map(([batchId, batch]) => (
                <div key={batchId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{batchId}</p>
                    <p className="text-xs text-muted-foreground">{batch.items!.length} items</p>
                  </div>
                  <Badge variant="secondary">KES {batch.total.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPanel;
