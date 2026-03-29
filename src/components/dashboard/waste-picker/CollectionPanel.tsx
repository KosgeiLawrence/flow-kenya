import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Package, Loader2, Leaf, Droplets, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { calculateImpact } from "@/lib/impactUtils";
import ClientCollectionFlow from "./ClientCollectionFlow";

const CollectionPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [materialTypeId, setMaterialTypeId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [locationName, setLocationName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: materialTypes } = useQuery({
    queryKey: ["material_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, material_types(name, unit, price_per_unit)")
        .eq("user_id", user!.id)
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addCollection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collections").insert({
        user_id: user!.id,
        material_type_id: materialTypeId,
        quantity: parseFloat(quantity),
        location_name: locationName || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection logged!");
      setMaterialTypeId("");
      setQuantity("");
      setLocationName("");
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const todayCollections = collections?.filter(
    c => format(new Date(c.collected_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ) || [];
  const todayTotal = todayCollections.reduce((sum, c) => sum + Number(c.quantity), 0);

  const impact = calculateImpact(
    (collections || []).map(c => ({
      quantity: c.quantity,
      material_types: (c as any).material_types,
    }))
  );

  const [activeTab, setActiveTab] = useState("log");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="log">Log Collection</TabsTrigger>
          <TabsTrigger value="client">Collect from Client</TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="mt-4">
          <ClientCollectionFlow onBack={() => setActiveTab("log")} />
        </TabsContent>

        <TabsContent value="log" className="mt-4 space-y-6">
      {/* Impact summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Today</p>
            <p className="text-2xl font-display font-bold text-foreground">{todayTotal.toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">CO₂ Avoided</p>
            </div>
            <p className="text-2xl font-display font-bold text-primary">{impact.co2Avoided.toFixed(0)} kg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Water Saved</p>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{impact.waterSaved.toFixed(0)} L</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Landfill Saved</p>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{impact.landfillReduced.toFixed(2)} m³</p>
          </CardContent>
        </Card>
      </div>

      {/* Material breakdown impact */}
      {impact.materialBreakdown.length > 0 && (
        <Card className="shadow-soft bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-2">Environmental Impact by Material</p>
            <div className="space-y-2">
              {impact.materialBreakdown.slice(0, 5).map(m => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium">{m.kg.toFixed(1)} kg → <span className="text-primary">{m.co2.toFixed(1)} kg CO₂ avoided</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Log Collection
        </Button>
      )}

      {/* Add form */}
      {showForm && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Log New Collection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={materialTypeId} onValueChange={setMaterialTypeId}>
              <SelectTrigger><SelectValue placeholder="Select material type" /></SelectTrigger>
              <SelectContent>
                {materialTypes?.map(mt => (
                  <SelectItem key={mt.id} value={mt.id}>{mt.name} (KES {mt.price_per_unit}/{mt.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Quantity (kg)" value={quantity} onChange={e => setQuantity(e.target.value)} min="0.1" step="0.1" />
            <Input placeholder="Location (optional)" value={locationName} onChange={e => setLocationName(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => addCollection.mutate()} disabled={!materialTypeId || !quantity || addCollection.isPending}>
                {addCollection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Recent Collections</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !collections?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No collections yet. Start logging!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collections.slice(0, 50).map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{(c as any).material_types?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.collected_at), "MMM d, yyyy • h:mm a")}
                      {c.location_name && ` • ${c.location_name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{Number(c.quantity).toFixed(1)} {(c as any).material_types?.unit}</p>
                    <Badge variant="outline" className="text-xs">{c.batch_id}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollectionPanel;
