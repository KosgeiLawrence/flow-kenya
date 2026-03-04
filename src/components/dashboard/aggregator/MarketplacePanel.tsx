import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, Recycle, ArrowRight, Search, Mail, Phone, Send, Loader2, Plus, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

const MarketplacePanel = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRecycler, setSelectedRecycler] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [locationName, setLocationName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: recyclers } = useQuery({
    queryKey: ["recycler_profiles"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "recycler");
      if (roleError) throw roleError;
      if (!roleData?.length) return [];

      const userIds = roleData.map(r => r.user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*, organizations(name, type)")
        .in("user_id", userIds)
        .eq("approval_status", "approved");
      if (error) throw error;
      return data;
    },
  });

  const { data: materials } = useQuery({
    queryKey: ["material_types_marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch available recycler products
  const { data: products } = useQuery({
    queryKey: ["recycler_products_marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recycler_products")
        .select("*, profiles!recycler_products_user_id_fkey(full_name)")
        .eq("status", "available");
      if (error) throw error;
      return data;
    },
  });

  // Fetch aggregator's own sent pickup requests to recyclers
  const { data: sentRequests, isLoading: sentLoading } = useQuery({
    queryKey: ["aggregator_sent_requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_requests")
        .select("*")
        .eq("waste_picker_id", user!.id)
        .eq("target_role", "recycler")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const sendRequest = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(quantityKg);
      const price = proposedPrice ? parseFloat(proposedPrice) : null;
      const { error } = await supabase.from("pickup_requests").insert({
        waste_picker_id: user!.id,
        target_user_id: targetUserId,
        target_role: "recycler",
        material_type: materialType,
        quantity_kg: qty,
        proposed_price_per_kg: price,
        total_amount: price ? qty * price : null,
        location_name: locationName || null,
        scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_sent_requests"] });
      toast.success("Pickup request sent to recycler!");
      setTargetUserId(""); setMaterialType(""); setQuantityKg("");
      setProposedPrice(""); setLocationName(""); setScheduledDate("");
      setNotes(""); setShowRequestForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit = targetUserId && materialType && quantityKg;

  const filteredRecyclers = recyclers?.filter(r =>
    !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    (r as any).organizations?.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getRecyclerName = (userId: string) =>
    recyclers?.find(r => r.user_id === userId)?.full_name || "Unknown";

  return (
    <div className="space-y-6">
      {/* Send Pickup Request to Recycler */}
      <Card className="shadow-soft border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Request Pickup from Recycler</p>
              <p className="text-xs text-muted-foreground">Send material pickup requests to recyclers for bulk sales.</p>
            </div>
          </div>
          {!showRequestForm && (
            <Button size="sm" onClick={() => setShowRequestForm(true)} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> New Request
            </Button>
          )}
        </CardContent>
      </Card>

      {showRequestForm && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Send Pickup Request</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
              >
                <option value="">Select Recycler *</option>
                {recyclers?.map(r => (
                  <option key={r.user_id} value={r.user_id}>
                    {r.full_name} {r.county ? `(${r.county})` : ""}
                  </option>
                ))}
              </select>
              <Input placeholder="Material Type *" value={materialType} onChange={e => setMaterialType(e.target.value)} />
              <Input placeholder="Quantity (kg) *" type="number" value={quantityKg} onChange={e => setQuantityKg(e.target.value)} />
              <Input placeholder="Proposed Price/kg (KES)" type="number" value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} />
              <Input placeholder="Location" value={locationName} onChange={e => setLocationName(e.target.value)} />
              <Input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="sm:col-span-2" />
            </div>
            {quantityKg && proposedPrice && (
              <p className="text-sm font-medium text-primary">
                Total: KES {(parseFloat(quantityKg || "0") * parseFloat(proposedPrice || "0")).toLocaleString()}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => sendRequest.mutate()} disabled={!canSubmit || sendRequest.isPending} className="gap-2">
                {sendRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Request</>}
              </Button>
              <Button variant="ghost" onClick={() => setShowRequestForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sent Requests History */}
      {(sentRequests?.length ?? 0) > 0 && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Sent Pickup Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentRequests?.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{getRecyclerName(r.target_user_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.material_type} • {r.quantity_kg} kg
                      {r.total_amount ? ` • KES ${Number(r.total_amount).toLocaleString()}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</p>
                    {r.response_notes && <p className="text-xs italic text-muted-foreground">Response: {r.response_notes}</p>}
                  </div>
                  <Badge variant={r.status === "accepted" ? "default" : r.status === "declined" ? "destructive" : "secondary"}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material prices */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> Current Market Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!materials?.length ? (
            <p className="text-sm text-muted-foreground">No pricing data available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{m.icon || "♻️"}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">per {m.unit}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-primary">KES {Number(m.price_per_unit).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recycler directory */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Recycle className="w-5 h-5 text-primary" /> Recycler Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search recyclers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {!filteredRecyclers.length ? (
            <div className="text-center py-8">
              <Recycle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recyclers found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRecyclers.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {r.full_name?.charAt(0) || "R"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(r as any).organizations?.name || "Independent"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.approval_status === "approved" ? "default" : "secondary"}>
                      {r.approval_status === "approved" ? "Active" : "Pending"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRecycler(r)}>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recycler detail dialog */}
      <Dialog open={!!selectedRecycler} onOpenChange={() => setSelectedRecycler(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedRecycler?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {(selectedRecycler as any)?.organizations?.name || "Independent Recycler"}
            </p>
            {selectedRecycler?.phone_number && (
              <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /> {selectedRecycler.phone_number}</div>
            )}
            {selectedRecycler?.email && (
              <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /> {selectedRecycler.email}</div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Contact this recycler directly to arrange material sales and negotiate pricing.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplacePanel;
