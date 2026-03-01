import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Package, Plus, Target, TrendingUp, Trash2 } from "lucide-react";
import { format } from "date-fns";

const MATERIAL_TYPES = ["PET", "HDPE", "LDPE", "PP", "PS", "Other Plastic"];
const RECOVERY_RATES: Record<string, number> = {
  PET: 0.5, HDPE: 0.4, LDPE: 0.3, PP: 0.35, PS: 0.25, "Other Plastic": 0.3,
};

const PlasticFootprintPanel = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    period_type: "monthly",
    period_start: "",
    period_end: "",
    material_type: "PET",
    quantity_kg: "",
  });

  const { data: declarations, isLoading } = useQuery({
    queryKey: ["plastic_declarations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plastic_declarations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const qty = Number(form.quantity_kg);
      const obligation = qty * (RECOVERY_RATES[form.material_type] || 0.3);
      const { error } = await supabase.from("plastic_declarations").insert({
        user_id: user!.id,
        period_type: form.period_type,
        period_start: form.period_start,
        period_end: form.period_end,
        material_type: form.material_type,
        quantity_kg: qty,
        recovery_obligation_kg: obligation,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plastic_declarations"] });
      toast.success("Declaration added");
      setShowForm(false);
      setForm({ period_type: "monthly", period_start: "", period_end: "", material_type: "PET", quantity_kg: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalDeclared = declarations?.reduce((s, d) => s + Number(d.quantity_kg), 0) || 0;
  const totalObligation = declarations?.reduce((s, d) => s + Number(d.recovery_obligation_kg), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Package className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{(totalDeclared / 1000).toFixed(1)} t</p>
            <p className="text-xs text-muted-foreground">Total Plastic Declared</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <Target className="w-7 h-7 text-destructive mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{(totalObligation / 1000).toFixed(1)} t</p>
            <p className="text-xs text-muted-foreground">Recovery Obligation</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-7 h-7 text-accent mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{declarations?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Declarations Filed</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Plastic Footprint Declarations</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> New Declaration
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Period Type</Label>
                  <Select value={form.period_type} onValueChange={(v) => setForm({ ...form, period_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Material Type</Label>
                  <Select value={form.material_type} onValueChange={(v) => setForm({ ...form, material_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Period Start</Label>
                  <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
                </div>
                <div>
                  <Label>Period End</Label>
                  <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
                </div>
                <div>
                  <Label>Quantity (kg)</Label>
                  <Input type="number" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} placeholder="e.g. 5000" />
                </div>
                <div className="flex items-end">
                  <div className="text-sm text-muted-foreground">
                    Recovery obligation: <span className="font-bold text-foreground">
                      {((Number(form.quantity_kg) || 0) * (RECOVERY_RATES[form.material_type] || 0.3)).toFixed(0)} kg
                    </span>
                    <br />({((RECOVERY_RATES[form.material_type] || 0.3) * 100).toFixed(0)}% rate for {form.material_type})
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => addMutation.mutate()} disabled={!form.quantity_kg || !form.period_start || !form.period_end || addMutation.isPending}>
                  Submit Declaration
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !declarations?.length ? (
            <p className="text-sm text-muted-foreground">No declarations yet. Add your first plastic footprint declaration.</p>
          ) : (
            <div className="space-y-2">
              {declarations.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{d.material_type}</Badge>
                      <Badge variant="outline">{d.period_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(d.period_start), "MMM yyyy")} – {format(new Date(d.period_end), "MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm">
                      <span>Declared: <strong>{Number(d.quantity_kg).toLocaleString()} kg</strong></span>
                      <span className="text-muted-foreground">Obligation: <strong>{Number(d.recovery_obligation_kg).toLocaleString()} kg</strong></span>
                    </div>
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

export default PlasticFootprintPanel;
