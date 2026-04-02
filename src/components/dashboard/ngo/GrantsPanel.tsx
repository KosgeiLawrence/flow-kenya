import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrash } from "@/hooks/useTrash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Briefcase, Target, DollarSign, Calendar, Plus, Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu",
  "Machakos", "Kajiado", "Kilifi", "Uasin Gishu", "Nyeri",
];

const GrantsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [funder, setFunder] = useState("");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [budget, setBudget] = useState("");
  const [targetKg, setTargetKg] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: programs } = useQuery({
    queryKey: ["ngo_programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ngo_programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["ngo_program_docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ngo_program_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createProgram = useMutation({
    mutationFn: async () => {
      if (!user || !name.trim() || !startDate || !endDate) throw new Error("Fill required fields");
      const { error } = await supabase.from("ngo_programs").insert({
        ngo_user_id: user.id,
        name: name.trim(),
        funder: funder.trim() || null,
        description: description.trim() || null,
        county: county || null,
        budget: parseFloat(budget) || 0,
        target_kg: parseFloat(targetKg) || 0,
        start_date: startDate,
        end_date: endDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ngo_programs"] });
      toast.success("Program created");
      setOpen(false);
      setName(""); setFunder(""); setDescription(""); setCounty(""); setBudget(""); setTargetKg(""); setStartDate(""); setEndDate("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadDoc = async (programId: string, file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB"); return; }
    setUploading(programId);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const path = `${user.id}/${programId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("ngo-documents").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("ngo-documents").getPublicUrl(path);

      const { error: dbErr } = await supabase.from("ngo_program_documents").insert({
        program_id: programId,
        ngo_user_id: user.id,
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
      });
      if (dbErr) throw dbErr;

      queryClient.invalidateQueries({ queryKey: ["ngo_program_docs"] });
      toast.success("Document uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const { softDelete } = useTrash();
  const handleDeleteDoc = async (d: any) => {
    const success = await softDelete("ngo_program_documents", d.id, d, d.name);
    if (success) queryClient.invalidateQueries({ queryKey: ["ngo_program_docs"] });
  };

  const totalBudget = programs?.reduce((s, p) => s + Number(p.budget), 0) || 0;
  const totalSpent = programs?.reduce((s, p) => s + Number(p.spent), 0) || 0;
  const activeCount = programs?.filter(p => p.status === "active").length || 0;

  const getStatusBadge = (p: any) => {
    const progress = p.target_kg > 0 ? (Number(p.recovered_kg) / Number(p.target_kg)) * 100 : 0;
    const budgetUtil = p.budget > 0 ? (Number(p.spent) / Number(p.budget)) * 100 : 0;
    if (p.status === "completed") return { variant: "secondary" as const, label: "Completed" };
    if (progress >= 90) return { variant: "default" as const, label: "On Track" };
    if (progress < 50 && budgetUtil > 60) return { variant: "destructive" as const, label: "Behind" };
    return { variant: "default" as const, label: "Active" };
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
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
              <p className="text-xl font-bold text-foreground">{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%</p>
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

      {/* Create program */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> New Program</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Program</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <Label>Program Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mombasa Youth Plastic Recovery" maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Funder</Label>
                  <Input value={funder} onChange={e => setFunder(e.target.value)} placeholder="e.g. USAID" maxLength={200} />
                </div>
                <div>
                  <Label>County</Label>
                  <Select value={county} onValueChange={setCounty}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Program description" maxLength={1000} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Budget (KES)</Label><Input type="number" value={budget} onChange={e => setBudget(e.target.value)} min="0" /></div>
                <div><Label>Target (kg)</Label><Input type="number" value={targetKg} onChange={e => setTargetKg(e.target.value)} min="0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div><Label>End Date *</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              </div>
              <Button className="w-full" onClick={() => createProgram.mutate()} disabled={createProgram.isPending || !name.trim() || !startDate || !endDate}>
                {createProgram.isPending ? "Creating..." : "Create Program"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Programs list */}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-lg">Programs & Grants</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!programs?.length ? (
            <p className="text-sm text-muted-foreground">No programs yet. Create one to start tracking.</p>
          ) : programs.map(p => {
            const budgetProgress = p.budget > 0 ? (Number(p.spent) / Number(p.budget)) * 100 : 0;
            const recoveryProgress = p.target_kg > 0 ? (Number(p.recovered_kg) / Number(p.target_kg)) * 100 : 0;
            const sb = getStatusBadge(p);
            const programDocs = docs?.filter(d => d.program_id === p.id) || [];

            return (
              <div key={p.id} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.funder ? `Funded by ${p.funder}` : "Self-funded"} · {p.county || "National"}</p>
                  </div>
                  <Badge variant={sb.variant}>{sb.label}</Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(p.start_date), "MMM d, yyyy")} — {format(new Date(p.end_date), "MMM d, yyyy")}
                </div>

                {/* Budget utilization */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Budget: KES {Number(p.budget).toLocaleString()}</span>
                    <span className="font-medium text-foreground">{budgetProgress.toFixed(0)}% used</span>
                  </div>
                  <Progress value={budgetProgress} className="h-2" />
                </div>

                {/* Recovery target */}
                {Number(p.target_kg) > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Target: {Number(p.target_kg).toLocaleString()} kg</span>
                      <span className="font-medium text-foreground">{recoveryProgress.toFixed(0)}% achieved</span>
                    </div>
                    <Progress value={Math.min(recoveryProgress, 100)} className="h-2" />
                  </div>
                )}

                {/* Documents */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Documents ({programDocs.length})</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(p.id, f); e.target.value = ""; }}
                      />
                      <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        {uploading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Upload
                      </span>
                    </label>
                  </div>
                  {programDocs.map(d => (
                    <div key={d.id} className="flex items-center gap-2 text-xs">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{d.name}</a>
                      <button onClick={() => handleDeleteDoc(d)} className="text-destructive hover:text-destructive/80 ml-auto shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
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
