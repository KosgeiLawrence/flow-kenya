import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { HandCoins, Plus, MapPin, TrendingUp, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos",
  "Kajiado", "Uasin Gishu", "Nyeri", "Kilifi", "All Counties",
];

const RecoveryCommitmentPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ target_kg: "", funded_amount: "", target_county: "All Counties", notes: "" });

  const { data: commitments, isLoading } = useQuery({
    queryKey: ["recovery_commitments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recovery_commitments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: declarations } = useQuery({
    queryKey: ["plastic_declarations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plastic_declarations").select("*");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recovery_commitments").insert({
        user_id: user!.id,
        target_kg: Number(form.target_kg),
        funded_amount: Number(form.funded_amount),
        target_county: form.target_county,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recovery_commitments"] });
      toast.success("Recovery commitment created");
      setShowForm(false);
      setForm({ target_kg: "", funded_amount: "", target_county: "All Counties", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalObligation = declarations?.reduce((s, d) => s + Number(d.recovery_obligation_kg), 0) || 0;
  const totalCommitted = commitments?.reduce((s, c) => s + Number(c.target_kg), 0) || 0;
  const totalFunded = commitments?.reduce((s, c) => s + Number(c.funded_amount), 0) || 0;
  const totalRecovered = commitments?.reduce((s, c) => s + Number(c.recovered_kg), 0) || 0;
  const commitmentCoverage = totalObligation > 0 ? Math.min((totalCommitted / totalObligation) * 100, 100) : 0;

  const statusColor: Record<string, string> = {
    active: "default",
    completed: "secondary",
    cancelled: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <HandCoins className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">KES {(totalFunded / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Total Funded</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-7 h-7 text-secondary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{(totalCommitted / 1000).toFixed(1)} t</p>
            <p className="text-xs text-muted-foreground">Committed Recovery</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{(totalRecovered / 1000).toFixed(1)} t</p>
            <p className="text-xs text-muted-foreground">Actually Recovered</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Obligation Coverage</p>
            <Progress value={commitmentCoverage} className="h-2 mb-1" />
            <p className="text-sm font-bold text-foreground">{commitmentCoverage.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recovery Commitments</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> New Commitment
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Recovery Target (kg)</Label>
                  <Input type="number" value={form.target_kg} onChange={(e) => setForm({ ...form, target_kg: e.target.value })} placeholder="e.g. 2000" />
                </div>
                <div>
                  <Label>Funding Amount (KES)</Label>
                  <Input type="number" value={form.funded_amount} onChange={(e) => setForm({ ...form, funded_amount: e.target.value })} placeholder="e.g. 500000" />
                </div>
                <div>
                  <Label>Target County</Label>
                  <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" value={form.target_county} onChange={(e) => setForm({ ...form, target_county: e.target.value })}>
                    {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => addMutation.mutate()} disabled={!form.target_kg || !form.funded_amount || addMutation.isPending}>
                  Create Commitment
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !commitments?.length ? (
            <p className="text-sm text-muted-foreground">No commitments yet. Create your first recovery commitment.</p>
          ) : (
            <div className="space-y-3">
              {commitments.map((c) => {
                const progress = Number(c.target_kg) > 0 ? Math.min((Number(c.recovered_kg) / Number(c.target_kg)) * 100, 100) : 0;
                return (
                  <div key={c.id} className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusColor[c.status] as any || "default"}>{c.status}</Badge>
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{c.target_county || "All Counties"}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <span>Target: <strong>{Number(c.target_kg).toLocaleString()} kg</strong></span>
                      <span>Funded: <strong>KES {Number(c.funded_amount).toLocaleString()}</strong></span>
                      <span>Recovered: <strong>{Number(c.recovered_kg).toLocaleString()} kg</strong></span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% recovered</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecoveryCommitmentPanel;
