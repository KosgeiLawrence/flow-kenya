import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

const LogisticsPanel = () => {
  const { user } = useAuth();

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

  const upcoming = schedules?.filter((s) => s.status === "scheduled") || [];
  const completed = schedules?.filter((s) => s.status === "completed") || [];
  const inProgress = schedules?.filter((s) => s.status === "in_progress") || [];

  const statusColor: Record<string, "default" | "secondary" | "destructive"> = {
    scheduled: "secondary",
    in_progress: "default",
    completed: "default",
    cancelled: "destructive",
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="w-8 h-8 text-accent" />
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
                  <Badge variant={statusColor[s.status] || "secondary"}>
                    {s.status.replace("_", " ")}
                  </Badge>
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
