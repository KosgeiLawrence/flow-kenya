import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Clock } from "lucide-react";

const categoryColors: Record<string, "default" | "secondary" | "outline"> = {
  sorting: "default",
  safety: "secondary",
  business: "outline",
  platform: "secondary",
  general: "outline",
};

const TrainingPanel = () => {
  const { data: resources, isLoading } = useQuery({
    queryKey: ["training_resources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_resources").select("*").order("created_at");
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
            <p className="text-sm font-medium text-foreground">Training Resources</p>
            <p className="text-xs text-muted-foreground">Learn best practices to maximize your earnings and stay safe.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources?.map(r => (
          <Card key={r.id} className="shadow-soft hover:shadow-elevated transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm">{r.title}</CardTitle>
                <Badge variant={categoryColors[r.category] || "outline"}>{r.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{r.description}</p>
              {r.duration_minutes && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{r.duration_minutes} min</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TrainingPanel;
