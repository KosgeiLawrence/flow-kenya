import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Clock, Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  upcoming: "default",
  ongoing: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

const categoryColors: Record<string, "default" | "secondary" | "outline"> = {
  sorting: "default",
  safety: "secondary",
  business: "outline",
  platform: "secondary",
  environmental: "default",
  compliance: "outline",
  general: "outline",
};

interface TrainingPanelProps {
  viewerRole?: string;
}

const TrainingPanel = ({ viewerRole }: TrainingPanelProps) => {
  const { role: authRole } = useAuth();
  const currentRole = viewerRole || authRole || "waste_picker";

  const { data: resources, isLoading } = useQuery({
    queryKey: ["training_resources_viewer", currentRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_resources")
        .select("*")
        .contains("target_roles", [currentRole])
        .order("training_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-soft border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-3 p-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Training & Capacity Building</p>
            <p className="text-xs text-muted-foreground">Upcoming training sessions and resources to help you grow.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources?.map(r => (
          <Card key={r.id} className="shadow-soft hover:shadow-elevated transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{r.title}</CardTitle>
                <div className="flex gap-1">
                  <Badge variant={statusColors[(r as any).status] || "outline"}>{(r as any).status || "upcoming"}</Badge>
                  <Badge variant={categoryColors[r.category] || "outline"}>{r.category}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {(r as any).training_date && (
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date((r as any).training_date), "MMM d, yyyy")}</span>
                )}
                {(r as any).training_time && (
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{(r as any).training_time}</span>
                )}
                {(r as any).venue && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{(r as any).venue}</span>
                )}
                {r.duration_minutes && (
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{r.duration_minutes} min</span>
                )}
              </div>
              {(r as any).creator_role && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>By: {(r as any).creator_role.replace("_", " ")}</span>
                </div>
              )}
              {r.content_url && (
                <Button size="sm" variant="outline" className="gap-1 mt-1" asChild>
                  <a href={r.content_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" /> View Resource
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {resources?.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">No training sessions available at the moment. Check back soon!</p>
        )}
      </div>
    </div>
  );
};

export default TrainingPanel;
