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
import { Package, Layers, TrendingUp, Users, Plus, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import OrdersPanel from "./OrdersPanel";
import SuppliersPanel from "./SuppliersPanel";
import { useTranslation } from "react-i18next";

interface InventoryItem {
  name: string;
  qty: number;
  unit: string;
  value: number;
  icon: string;
  source: "collection" | "order" | "both";
}

const InventoryAccessPanel = () => {
  const { t } = useTranslation();
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

  const { data: deliveredOrders } = useQuery({
    queryKey: ["recycler_delivered_orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recycler_orders")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "delivered")
        .order("created_at", { ascending: false });
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

  // Aggregate collections by material type
  const materialMap = new Map<string, InventoryItem>();

  collections?.forEach((c) => {
    const mt = (c as any).material_types;
    const key = mt?.name || c.material_type_id;
    const existing = materialMap.get(key);
    const qty = Number(c.quantity);
    const price = Number(mt?.price_per_unit || 0);
    if (existing) {
      existing.qty += qty;
      existing.value += qty * price;
    } else {
      materialMap.set(key, {
        name: mt?.name || "Unknown",
        qty,
        unit: mt?.unit || "kg",
        value: qty * price,
        icon: mt?.icon || "♻️",
        source: "collection",
      });
    }
  });

  // Merge delivered orders into inventory
  deliveredOrders?.forEach((o) => {
    const key = o.material_type;
    const existing = materialMap.get(key);
    const qty = Number(o.quantity);
    const unitPrice = Number(o.unit_price);
    if (existing) {
      existing.qty += qty;
      existing.value += qty * unitPrice;
      existing.source = "both";
    } else {
      materialMap.set(key, {
        name: o.material_type,
        qty,
        unit: o.unit,
        value: qty * unitPrice,
        icon: "📦",
        source: "order",
      });
    }
  });

  const totalValue = Array.from(materialMap.values()).reduce((s, m) => s + m.value, 0);
  const totalQty = Array.from(materialMap.values()).reduce((s, m) => s + m.qty, 0);
  const uniqueSuppliers = new Set([
    ...(collections?.map((c) => c.user_id) || []),
    ...(deliveredOrders?.map((o) => o.supplier_name) || []),
  ]).size;
  const totalOrders = deliveredOrders?.length || 0;

  return (
    <Tabs defaultValue="stock" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="stock"><Package className="w-4 h-4 mr-1.5" />Stock</TabsTrigger>
        <TabsTrigger value="orders"><ClipboardList className="w-4 h-4 mr-1.5" />Orders</TabsTrigger>
        <TabsTrigger value="suppliers"><Users className="w-4 h-4 mr-1.5" />Suppliers</TabsTrigger>
      </TabsList>

      <TabsContent value="stock" className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <ClipboardList className="w-7 h-7 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold text-foreground">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Delivered Orders</p>
              </div>
            </CardContent>
          </Card>
        </div>

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
              <Input type="number" placeholder="Quantity (kg)" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              <Input placeholder="Source / location (optional)" value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} />
              <Button className="w-full" onClick={() => addEntry.mutate()} disabled={!form.material_type_id || !form.quantity || addEntry.isPending}>
                {addEntry.isPending ? "Adding..." : "Add to Inventory"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-lg">Inventory Summary</CardTitle></CardHeader>
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
                    <div className="flex items-center gap-2">
                      {m.source === "order" && <Badge variant="secondary" className="text-xs">From Orders</Badge>}
                      {m.source === "both" && <Badge variant="secondary" className="text-xs">Mixed Sources</Badge>}
                      <p className="text-sm font-semibold text-foreground">KES {m.value.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {deliveredOrders && deliveredOrders.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-lg">Recent Delivered Orders</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {deliveredOrders.slice(0, 10).map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.material_type} — {Number(o.quantity).toFixed(0)} {o.unit}</p>
                      <p className="text-xs text-muted-foreground">{o.supplier_name} · {format(new Date(o.order_date), "MMM d, yyyy")}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">KES {Number(o.total_amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="orders">
        <OrdersPanel />
      </TabsContent>

      <TabsContent value="suppliers">
        <SuppliersPanel />
      </TabsContent>
    </Tabs>
  );
};

export default InventoryAccessPanel;
