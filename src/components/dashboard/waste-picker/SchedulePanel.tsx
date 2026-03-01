import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Calendar, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";

const SchedulePanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["pickup_schedules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_schedules")
        .select("*")
        .eq("user_id", user!.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pickup_schedules").insert({
        user_id: user!.id,
        location_name: location,
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup_schedules"] });
      toast.success("Pickup scheduled!");
      setLocation("");
      setScheduledAt("");
      setNotes("");
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    scheduled: "secondary",
    confirmed: "default",
    completed: "default",
    cancelled: "destructive",
  };

  return (
    <div className="space-y-6">
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Schedule Pickup
        </Button>
      )}

      {showForm && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Schedule a Pickup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => addSchedule.mutate()} disabled={!location || !scheduledAt || addSchedule.isPending}>
                {addSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Upcoming Pickups</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !schedules?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No pickups scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium">{s.location_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(s.scheduled_at), "MMM d, yyyy • h:mm a")}
                    </p>
                    {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                  </div>
                  <Badge variant={statusColors[s.status] || "secondary"}>{s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulePanel;
