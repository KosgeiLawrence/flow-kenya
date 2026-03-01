import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
        .order("collected_at", { ascending: false })
        .limit(50);
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

  const todayTotal = collections
    ?.filter(c => format(new Date(c.collected_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"))
    .reduce((sum, c) => sum + Number(c.quantity), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Today</p>
            <p className="text-2xl font-display font-bold text-foreground">{todayTotal.toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Entries</p>
            <p className="text-2xl font-display font-bold text-foreground">{collections?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

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
            <Input
              type="number"
              placeholder="Quantity (kg)"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="0.1"
              step="0.1"
            />
            <Input
              placeholder="Location (optional)"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => addCollection.mutate()}
                disabled={!materialTypeId || !quantity || addCollection.isPending}
              >
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
              {collections.map(c => (
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
    </div>
  );
};

export default CollectionPanel;
