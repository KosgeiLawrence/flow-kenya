import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Target, DollarSign, Calendar, CheckCircle2, Clock } from "lucide-react";

interface Program {
  id: string;
  name: string;
  funder: string;
  budget: string;
  spent: number;
  total: number;
  status: "active" | "completed" | "upcoming";
  startDate: string;
  endDate: string;
}

const mockPrograms: Program[] = [
  { id: "1", name: "Community Waste Collection Drive", funder: "USAID Kenya", budget: "KES 2,500,000", spent: 1_800_000, total: 2_500_000, status: "active", startDate: "Jan 2026", endDate: "Jun 2026" },
  { id: "2", name: "Picker Safety & Training", funder: "GIZ", budget: "KES 800,000", spent: 800_000, total: 800_000, status: "completed", startDate: "Sep 2025", endDate: "Dec 2025" },
  { id: "3", name: "Youth Recycling Initiative", funder: "UN-Habitat", budget: "KES 1,200,000", spent: 0, total: 1_200_000, status: "upcoming", startDate: "Apr 2026", endDate: "Sep 2026" },
  { id: "4", name: "Plastic-Free Waterways", funder: "World Bank", budget: "KES 3,000,000", spent: 950_000, total: 3_000_000, status: "active", startDate: "Nov 2025", endDate: "Oct 2026" },
];

const statusBadge: Record<string, { variant: "default" | "secondary"; label: string }> = {
  active: { variant: "default", label: "Active" },
  completed: { variant: "secondary", label: "Completed" },
  upcoming: { variant: "secondary", label: "Upcoming" },
};

const GrantsPanel = () => {
  const [programs] = useState<Program[]>(mockPrograms);

  const totalBudget = programs.reduce((s, p) => s + p.total, 0);
  const totalSpent = programs.reduce((s, p) => s + p.spent, 0);
  const activeCount = programs.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">KES {(totalBudget / 1_000_000).toFixed(1)}M</p>
              <p className="text-xs text-muted-foreground">Total Grants</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{Math.round((totalSpent / totalBudget) * 100)}%</p>
              <p className="text-xs text-muted-foreground">Utilization</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Briefcase className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Programs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Programs & Grants</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {programs.map((p) => {
            const progress = p.total > 0 ? (p.spent / p.total) * 100 : 0;
            const sb = statusBadge[p.status];
            return (
              <div key={p.id} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Funded by {p.funder}</p>
                  </div>
                  <Badge variant={sb.variant}>{sb.label}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {p.startDate} — {p.endDate}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Budget: {p.budget}</span>
                    <span className="font-medium text-foreground">{progress.toFixed(0)}% used</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default GrantsPanel;
