import { useState } from "react";
import { getDisplayName } from "@/lib/displayUtils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Clock, Truck, MapPin } from "lucide-react";
import { format } from "date-fns";

const RequestedPickupsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});

  const { data: requests, isLoading } = useQuery({
    queryKey: ["pickup_requests_target", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_requests")
        .select("*")
        .eq("target_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch requester names (waste pickers and aggregators)
  const requesterIds = [...new Set(requests?.map(r => r.waste_picker_id) || [])];
  const { data: pickerProfiles } = useQuery({
    queryKey: ["requester_profiles", requesterIds],
    queryFn: async () => {
      if (!requesterIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone_number, email, county, organization_id, organizations(name)")
        .in("user_id", requesterIds);
      return data || [];
    },
    enabled: requesterIds.length > 0,
  });

  // Realtime subscription
  useQuery({
    queryKey: ["pickup_requests_target_realtime", user?.id],
    queryFn: () => {
      const channel = supabase
        .channel("pickup-requests-target")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "pickup_requests",
          filter: `target_user_id=eq.${user!.id}`,
        }, () => {
          queryClient.invalidateQueries({ queryKey: ["pickup_requests_target"] });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    },
    enabled: !!user?.id,
  });

  const respondToRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("pickup_requests")
        .update({
          status,
          response_notes: responseNotes[id] || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["pickup_requests_target"] });
      toast.success(`Request ${status}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getPickerName = (pickerId: string) => {
    const p = pickerProfiles?.find(p => p.user_id === pickerId);
    return getDisplayName(p, "Unknown Requester");
  };

  const getPickerContact = (pickerId: string) => {
    const p = pickerProfiles?.find(pp => pp.user_id === pickerId);
    return p ? `${p.phone_number || ""} ${p.email || ""}`.trim() : "";
  };

  const pendingRequests = requests?.filter(r => r.status === "pending") || [];
  const processedRequests = requests?.filter(r => r.status !== "pending") || [];

  return (
    <div className="space-y-6">
      <Card className="shadow-soft border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Pickup Requests</p>
            <p className="text-xs text-muted-foreground">
              Waste pickers have requested you to pick up materials. Review and accept or decline.
              {pendingRequests.length > 0 && ` You have ${pendingRequests.length} pending request(s).`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" /> Pending Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !pendingRequests.length ? (
            <p className="text-center py-6 text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(r => (
                <div key={r.id} className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{getPickerName(r.waste_picker_id)}</p>
                      <p className="text-xs text-muted-foreground">{getPickerContact(r.waste_picker_id)}</p>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Material:</span>
                      <p className="font-medium">{r.material_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <p className="font-medium">{r.quantity_kg} kg</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price/kg:</span>
                      <p className="font-medium">{r.proposed_price_per_kg ? `KES ${r.proposed_price_per_kg}` : "To negotiate"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <p className="font-medium">{r.total_amount ? `KES ${Number(r.total_amount).toLocaleString()}` : "TBD"}</p>
                    </div>
                  </div>
                  {r.location_name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {r.location_name}
                    </div>
                  )}
                  {r.scheduled_date && (
                    <p className="text-xs text-muted-foreground">
                      Scheduled: {format(new Date(r.scheduled_date), "MMM d, yyyy h:mm a")}
                    </p>
                  )}
                  {r.notes && <p className="text-xs text-muted-foreground italic">Notes: {r.notes}</p>}
                  <Input
                    placeholder="Response notes (optional)"
                    value={responseNotes[r.id] || ""}
                    onChange={e => setResponseNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => respondToRequest.mutate({ id: r.id, status: "accepted" })}
                      disabled={respondToRequest.isPending}
                      className="gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => respondToRequest.mutate({ id: r.id, status: "declined" })}
                      disabled={respondToRequest.isPending}
                      className="gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Previous Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{getPickerName(r.waste_picker_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.material_type} • {r.quantity_kg} kg
                      {r.total_amount ? ` • KES ${Number(r.total_amount).toLocaleString()}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                      {r.responded_at && ` • Responded ${format(new Date(r.responded_at), "MMM d")}`}
                    </p>
                  </div>
                  <Badge variant={r.status === "accepted" ? "default" : "destructive"}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RequestedPickupsPanel;
