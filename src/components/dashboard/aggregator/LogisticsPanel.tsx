import { useState, useCallback } from "react";
import { useChatbotUIAction } from "@/hooks/useChatbotUIAction";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, MapPin, Calendar, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const LogisticsPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ location_name: "", scheduled_at: "", notes: "" });

  useChatbotUIAction(["add-pickup-schedule"], useCallback(() => setOpen(true), []));

  const { data: schedules } = useQuery({
    queryKey: ["aggregator_logistics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_schedules")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pickup_schedules").insert({
        user_id: user!.id,
        location_name: form.location_name,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_logistics"] });
      setOpen(false);
      setForm({ location_name: "", scheduled_at: "", notes: "" });
      toast.success("Pickup scheduled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("pickup_schedules").update({ status }).eq("id", id);
      if (error) throw error;

      // When completed, record as expense in financial_transactions
      if (status === "completed" && user) {
        const schedule = schedules?.find(s => s.id === id);
        await supabase.from("financial_transactions").insert({
          user_id: user.id,
          type: "expense",
          amount: 0, // User can update the amount later in Earnings & Expenses
          description: `Pickup completed: ${schedule?.location_name || "Unknown location"}`,
          payment_method: "cash",
          transaction_date: new Date().toISOString().split("T")[0],
        });
        queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_logistics"] });
      toast.success("Status updated");
    },
  });

  const upcoming = schedules?.filter((s) => s.status === "scheduled") || [];
  const inProgress = schedules?.filter((s) => s.status === "in_progress") || [];
  const completed = schedules?.filter((s) => s.status === "completed") || [];

  const statusColor: Record<string, "default" | "secondary" | "destructive"> = {
    scheduled: "secondary",
    in_progress: "default",
    completed: "default",
    cancelled: "destructive",
  };

  const nextStatus: Record<string, string> = {
    scheduled: "in_progress",
    in_progress: "completed",
  };

  return (
    <div className="space-y-6">
      {/* Summary + Add */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="w-8 h-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{upcoming.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <Truck className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{inProgress.length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-foreground">{completed.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Pickup Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button><Plus className="w-4 h-4 mr-1" /> Schedule Pickup</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule New Pickup</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Location name (e.g. Dandora Collection Point)"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            />
            <Input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            />
            <Textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={!form.location_name || !form.scheduled_at || createMutation.isPending}
            >
              {createMutation.isPending ? "Scheduling..." : "Schedule Pickup"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule list */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Pickup Schedule</CardTitle></CardHeader>
        <CardContent>
          {!schedules?.length ? (
            <p className="text-sm text-muted-foreground">No pickups scheduled.</p>
          ) : (
            <div className="divide-y divide-border">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.location_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.scheduled_at), "MMM d, yyyy · h:mm a")}
                      </p>
                      {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {nextStatus[s.status] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: s.id, status: nextStatus[s.status] })}
                      >
                        {s.status === "scheduled" ? "Start" : "Complete"}
                      </Button>
                    )}
                    <Badge variant={statusColor[s.status] || "secondary"}>
                      {s.status.replace("_", " ")}
                    </Badge>
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

export default LogisticsPanel;
