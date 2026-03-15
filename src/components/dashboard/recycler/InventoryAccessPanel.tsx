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
import { Package, Layers, TrendingUp, Users, Plus } from "lucide-react";
import { toast } from "sonner";

const InventoryAccessPanel = () => {
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
    queryKey: ["recycler_inventory", user?.id],
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
      queryClient.invalidateQueries({ queryKey: ["recycler_inventory"] });
      setOpen(false);
      setForm({ material_type_id: "", quantity: "", location_name: "" });
      toast.success("Inventory entry added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Aggregate by material
  const materialMap = new Map<string, { name: string; qty: number; unit: string; value: number; icon: string }>();
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
        icon: mt?.icon || "♻️",
      });
    }
  });

  const totalValue = Array.from(materialMap.values()).reduce((s, m) => s + m.value, 0);
  const totalQty = Array.from(materialMap.values()).reduce((s, m) => s + m.qty, 0);
  const uniqueSuppliers = new Set(collections?.map((c) => c.user_id)).size;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{totalQty.toFixed(0)} kg</p>
              <p className="text-xs text-muted-foreground">Available Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Layers className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{materialMap.size}</p>
              <p className="text-xs text-muted-foreground">Material Types</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">KES {totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Market Value</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold text-foreground">{uniqueSuppliers}</p>
              <p className="text-xs text-muted-foreground">Suppliers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Inventory Entry */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button><Plus className="w-4 h-4 mr-1" /> Add to Inventory</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Material Receipt</DialogTitle></DialogHeader>
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
              placeholder="Source / location (optional)"
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

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Available Materials from Aggregators</CardTitle></CardHeader>
        <CardContent>
          {!materialMap.size ? (
            <p className="text-sm text-muted-foreground">No inventory data available.</p>
          ) : (
            <div className="divide-y divide-border">
              {Array.from(materialMap.values()).map((m, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{m.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.qty.toFixed(1)} {m.unit} available</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">KES {m.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAccessPanel;
