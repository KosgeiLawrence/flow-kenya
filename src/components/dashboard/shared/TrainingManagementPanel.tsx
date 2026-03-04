import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, BookOpen, Calendar, MapPin, Clock, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const targetRoleOptions = [
  { value: "waste_picker", label: "Waste Pickers" },
  { value: "aggregator", label: "Aggregators" },
  { value: "recycler", label: "Recyclers" },
];

const trainingTypes = [
  { value: "sorting", label: "Sorting" },
  { value: "safety", label: "Safety" },
  { value: "business", label: "Business Skills" },
  { value: "platform", label: "Platform Training" },
  { value: "environmental", label: "Environmental" },
  { value: "compliance", label: "Compliance" },
  { value: "general", label: "General" },
];

const statusOptions = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  upcoming: "default",
  ongoing: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

interface TrainingForm {
  title: string;
  description: string;
  category: string;
  training_type: string;
  training_date: string;
  training_time: string;
  venue: string;
  duration_minutes: string;
  target_roles: string[];
  status: string;
  content_url: string;
}

const emptyForm: TrainingForm = {
  title: "",
  description: "",
  category: "general",
  training_type: "general",
  training_date: "",
  training_time: "",
  venue: "",
  duration_minutes: "",
  target_roles: ["waste_picker", "aggregator", "recycler"],
  status: "upcoming",
  content_url: "",
};

const TrainingManagementPanel = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrainingForm>(emptyForm);

  const { data: trainings, isLoading } = useQuery({
    queryKey: ["training_resources_managed", user?.id],
    queryFn: async () => {
      let query = supabase.from("training_resources").select("*").order("created_at", { ascending: false });
      // Admins see all, others see only own
      if (role !== "admin") {
        query = query.eq("created_by_user_id", user!.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = {
        title: form.title,
        description: form.description || null,
        category: form.category,
        training_type: form.training_type,
        training_date: form.training_date || null,
        training_time: form.training_time || null,
        venue: form.venue || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        target_roles: form.target_roles,
        status: form.status,
        content_url: form.content_url || null,
        created_by_user_id: user!.id,
        creator_role: role!,
      };

      if (isEdit && editingId) {
        const { error } = await supabase.from("training_resources").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_resources").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Training updated" : "Training created");
      queryClient.invalidateQueries({ queryKey: ["training_resources_managed"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Training deleted");
      queryClient.invalidateQueries({ queryKey: ["training_resources_managed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description || "",
      category: t.category,
      training_type: t.training_type || "general",
      training_date: t.training_date || "",
      training_time: t.training_time || "",
      venue: t.venue || "",
      duration_minutes: t.duration_minutes?.toString() || "",
      target_roles: t.target_roles || ["waste_picker", "aggregator", "recycler"],
      status: t.status || "upcoming",
      content_url: t.content_url || "",
    });
    setDialogOpen(true);
  };

  const toggleTargetRole = (role: string) => {
    setForm(f => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter(r => r !== role)
        : [...f.target_roles, role],
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Card className="flex-1 shadow-soft border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Training Management</p>
              <p className="text-xs text-muted-foreground">Create and manage training sessions for waste pickers, aggregators, and recyclers.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogTrigger asChild>
          <Button className="gap-2"><Plus className="w-4 h-4" /> Create Training</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Training" : "Create Training"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Plastic Sorting Best Practices" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Training details..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.training_type} onValueChange={v => setForm(f => ({ ...f, training_type: v, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {trainingTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.training_date} onChange={e => setForm(f => ({ ...f, training_date: e.target.value }))} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.training_time} onChange={e => setForm(f => ({ ...f, training_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Venue</Label>
                <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Location or online link" />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="e.g. 60" />
              </div>
            </div>
            <div>
              <Label>Resource URL (optional)</Label>
              <Input value={form.content_url} onChange={e => setForm(f => ({ ...f, content_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label className="mb-2 block">Target Audience *</Label>
              <div className="flex flex-wrap gap-3">
                {targetRoleOptions.map(r => (
                  <label key={r.value} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.target_roles.includes(r.value)} onCheckedChange={() => toggleTargetRole(r.value)} />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!form.title || form.target_roles.length === 0 || saveMutation.isPending}
              onClick={() => saveMutation.mutate(!!editingId)}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Update Training" : "Create Training"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trainings?.map(t => (
          <Card key={t.id} className="shadow-soft">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{t.title}</CardTitle>
                <div className="flex items-center gap-1">
                  <Badge variant={statusColors[(t as any).status] || "outline"}>{(t as any).status || "upcoming"}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {(t as any).training_date && (
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date((t as any).training_date), "MMM d, yyyy")}</span>
                )}
                {(t as any).training_time && (
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{(t as any).training_time}</span>
                )}
                {(t as any).venue && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{(t as any).venue}</span>
                )}
                {t.duration_minutes && (
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t.duration_minutes} min</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="flex gap-1">
                  {((t as any).target_roles || []).map((r: string) => (
                    <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0">{r.replace("_", " ")}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(t)}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(t.id)}>
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {trainings?.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">No training sessions created yet. Click "Create Training" to get started.</p>
        )}
      </div>
    </div>
  );
};

export default TrainingManagementPanel;
