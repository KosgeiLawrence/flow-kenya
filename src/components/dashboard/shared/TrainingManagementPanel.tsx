import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrash } from "@/hooks/useTrash";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, BookOpen, Calendar, MapPin, Clock, Pencil, Trash2, Users, TreePine, Award } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

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

const communityTrainingTypes = [
  { value: "awareness", label: "Awareness Campaign" },
  { value: "sorting", label: "Waste Sorting" },
  { value: "recycling", label: "Recycling Practices" },
  { value: "composting", label: "Composting" },
  { value: "health_safety", label: "Health & Safety" },
  { value: "environmental", label: "Environmental Conservation" },
  { value: "livelihood", label: "Livelihood Skills" },
  { value: "other", label: "Other" },
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

interface CommunityForm {
  title: string;
  description: string;
  training_date: string;
  venue: string;
  community_name: string;
  county: string;
  duration_minutes: string;
  num_participants: string;
  num_women: string;
  num_youth: string;
  topics_covered: string;
  waste_collected_kg: string;
  trees_planted: string;
  impact_notes: string;
  training_type: string;
}

const emptyCommunityForm: CommunityForm = {
  title: "",
  description: "",
  training_date: "",
  venue: "",
  community_name: "",
  county: "",
  duration_minutes: "",
  num_participants: "",
  num_women: "",
  num_youth: "",
  topics_covered: "",
  waste_collected_kg: "",
  trees_planted: "",
  impact_notes: "",
  training_type: "awareness",
};

const TrainingManagementPanel = () => {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrainingForm>(emptyForm);

  // Community training state
  const [communityDialogOpen, setCommunityDialogOpen] = useState(false);
  const [editingCommunityId, setEditingCommunityId] = useState<string | null>(null);
  const [communityForm, setCommunityForm] = useState<CommunityForm>(emptyCommunityForm);

  const { data: trainings, isLoading } = useQuery({
    queryKey: ["training_resources_managed", user?.id],
    queryFn: async () => {
      let query = supabase.from("training_resources").select("*").order("created_at", { ascending: false });
      if (role !== "admin") {
        query = query.eq("created_by_user_id", user!.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: communityTrainings, isLoading: communityLoading } = useQuery({
    queryKey: ["community_training_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_training_logs" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("training_date", { ascending: false });
      if (error) throw error;
      return data as any[];
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

  const saveCommunityMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = {
        user_id: user!.id,
        title: communityForm.title,
        description: communityForm.description || null,
        training_date: communityForm.training_date,
        venue: communityForm.venue || null,
        community_name: communityForm.community_name || null,
        county: communityForm.county || null,
        duration_minutes: communityForm.duration_minutes ? parseInt(communityForm.duration_minutes) : null,
        num_participants: parseInt(communityForm.num_participants) || 0,
        num_women: parseInt(communityForm.num_women) || 0,
        num_youth: parseInt(communityForm.num_youth) || 0,
        topics_covered: communityForm.topics_covered || null,
        waste_collected_kg: parseFloat(communityForm.waste_collected_kg) || 0,
        trees_planted: parseInt(communityForm.trees_planted) || 0,
        impact_notes: communityForm.impact_notes || null,
        training_type: communityForm.training_type,
      };

      if (isEdit && editingCommunityId) {
        const { error } = await supabase.from("community_training_logs" as any).update(payload).eq("id", editingCommunityId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_training_logs" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingCommunityId ? "Training log updated" : "Community training logged");
      queryClient.invalidateQueries({ queryKey: ["community_training_logs"] });
      setCommunityDialogOpen(false);
      setEditingCommunityId(null);
      setCommunityForm(emptyCommunityForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { softDelete } = useTrash();

  const handleDeleteTraining = async (t: any) => {
    const success = await softDelete("training_resources", t.id, t, t.title);
    if (success) queryClient.invalidateQueries({ queryKey: ["training_resources_managed"] });
  };

  const handleDeleteCommunityLog = async (t: any) => {
    const success = await softDelete("community_training_logs", t.id, t, t.title);
    if (success) queryClient.invalidateQueries({ queryKey: ["community_training_logs"] });
  };

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

  const openEditCommunity = (t: any) => {
    setEditingCommunityId(t.id);
    setCommunityForm({
      title: t.title,
      description: t.description || "",
      training_date: t.training_date || "",
      venue: t.venue || "",
      community_name: t.community_name || "",
      county: t.county || "",
      duration_minutes: t.duration_minutes?.toString() || "",
      num_participants: t.num_participants?.toString() || "",
      num_women: t.num_women?.toString() || "",
      num_youth: t.num_youth?.toString() || "",
      topics_covered: t.topics_covered || "",
      waste_collected_kg: t.waste_collected_kg?.toString() || "",
      trees_planted: t.trees_planted?.toString() || "",
      impact_notes: t.impact_notes || "",
      training_type: t.training_type || "awareness",
    });
    setCommunityDialogOpen(true);
  };

  const toggleTargetRole = (role: string) => {
    setForm(f => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter(r => r !== role)
        : [...f.target_roles, role],
    }));
  };

  // Summary stats for community trainings
  const totalParticipants = communityTrainings?.reduce((s, t) => s + Number(t.num_participants || 0), 0) || 0;
  const totalWomen = communityTrainings?.reduce((s, t) => s + Number(t.num_women || 0), 0) || 0;
  const totalYouth = communityTrainings?.reduce((s, t) => s + Number(t.num_youth || 0), 0) || 0;
  const totalWasteCollected = communityTrainings?.reduce((s, t) => s + Number(t.waste_collected_kg || 0), 0) || 0;
  const totalTreesPlanted = communityTrainings?.reduce((s, t) => s + Number(t.trees_planted || 0), 0) || 0;

  if (isLoading && communityLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="scheduled">
        <TabsList>
          <TabsTrigger value="scheduled"><BookOpen className="w-4 h-4 mr-1.5" />Scheduled Trainings</TabsTrigger>
          <TabsTrigger value="community"><Award className="w-4 h-4 mr-1.5" />Community Impact Log</TabsTrigger>
        </TabsList>

        {/* ── Scheduled Trainings Tab ── */}
        <TabsContent value="scheduled" className="space-y-4 mt-4">
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
                    <Label>{t("trainingPanel.duration", "Duration (minutes)")}</Label>
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
                    <Badge variant={statusColors[(t as any).status] || "outline"}>{(t as any).status || "upcoming"}</Badge>
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
                    <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleDeleteTraining(t)}>
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
        </TabsContent>

        {/* ── Community Impact Log Tab ── */}
        <TabsContent value="community" className="space-y-4 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-foreground">{communityTrainings?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Trainings</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalParticipants}</p>
                <p className="text-xs text-muted-foreground">Participants</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalWomen}</p>
                <p className="text-xs text-muted-foreground">Women</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalYouth}</p>
                <p className="text-xs text-muted-foreground">Youth</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-foreground">{totalWasteCollected.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">kg Waste</p>
              </CardContent>
            </Card>
          </div>

          {/* Log Community Training Dialog */}
          <Dialog open={communityDialogOpen} onOpenChange={(o) => { setCommunityDialogOpen(o); if (!o) { setEditingCommunityId(null); setCommunityForm(emptyCommunityForm); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Log Community Training</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCommunityId ? "Edit Training Log" : "Log Community Training"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Training Title *</Label>
                  <Input value={communityForm.title} onChange={e => setCommunityForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Waste Sorting Workshop — Likoni" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={communityForm.description} onChange={e => setCommunityForm(f => ({ ...f, description: e.target.value }))} placeholder="What was covered..." rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" value={communityForm.training_date} onChange={e => setCommunityForm(f => ({ ...f, training_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={communityForm.training_type} onValueChange={v => setCommunityForm(f => ({ ...f, training_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {communityTrainingTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Venue / Location</Label>
                    <Input value={communityForm.venue} onChange={e => setCommunityForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. Likoni Community Hall" />
                  </div>
                  <div>
                    <Label>Community Name</Label>
                    <Input value={communityForm.community_name} onChange={e => setCommunityForm(f => ({ ...f, community_name: e.target.value }))} placeholder="e.g. Likoni" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>County</Label>
                    <Input value={communityForm.county} onChange={e => setCommunityForm(f => ({ ...f, county: e.target.value }))} placeholder="e.g. Mombasa" />
                  </div>
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={communityForm.duration_minutes} onChange={e => setCommunityForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="e.g. 120" />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Users className="w-4 h-4" /> Attendance</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Total Participants *</Label>
                      <Input type="number" value={communityForm.num_participants} onChange={e => setCommunityForm(f => ({ ...f, num_participants: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Women</Label>
                      <Input type="number" value={communityForm.num_women} onChange={e => setCommunityForm(f => ({ ...f, num_women: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Youth (&lt;35)</Label>
                      <Input type="number" value={communityForm.num_youth} onChange={e => setCommunityForm(f => ({ ...f, num_youth: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Topics Covered</Label>
                  <Textarea value={communityForm.topics_covered} onChange={e => setCommunityForm(f => ({ ...f, topics_covered: e.target.value }))} placeholder="e.g. Plastic types, sorting techniques, income from recycling" rows={2} />
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><TreePine className="w-4 h-4" /> Impact Created</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Waste Collected (kg)</Label>
                      <Input type="number" step="0.1" value={communityForm.waste_collected_kg} onChange={e => setCommunityForm(f => ({ ...f, waste_collected_kg: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Trees Planted</Label>
                      <Input type="number" value={communityForm.trees_planted} onChange={e => setCommunityForm(f => ({ ...f, trees_planted: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Impact Notes</Label>
                    <Textarea value={communityForm.impact_notes} onChange={e => setCommunityForm(f => ({ ...f, impact_notes: e.target.value }))} placeholder="Describe the outcomes and impact..." rows={2} />
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={!communityForm.title || !communityForm.training_date || !communityForm.num_participants || saveCommunityMutation.isPending}
                  onClick={() => saveCommunityMutation.mutate(!!editingCommunityId)}
                >
                  {saveCommunityMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCommunityId ? "Update Log" : "Save Training Log"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Community Training List */}
          <div className="space-y-3">
            {communityTrainings?.map(t => (
              <Card key={t.id} className="shadow-soft">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.training_date && format(new Date(t.training_date), "MMM d, yyyy")}
                        {t.community_name && ` · ${t.community_name}`}
                        {t.county && `, ${t.county}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{communityTrainingTypes.find(ct => ct.value === t.training_type)?.label || t.training_type}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3.5 h-3.5" />{t.num_participants} participants</span>
                    {Number(t.num_women) > 0 && <span className="text-muted-foreground">{t.num_women} women</span>}
                    {Number(t.num_youth) > 0 && <span className="text-muted-foreground">{t.num_youth} youth</span>}
                    {Number(t.waste_collected_kg) > 0 && <span className="text-primary font-medium">{t.waste_collected_kg} kg waste</span>}
                    {Number(t.trees_planted) > 0 && <span className="flex items-center gap-1 text-primary"><TreePine className="w-3.5 h-3.5" />{t.trees_planted} trees</span>}
                    {t.venue && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{t.venue}</span>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openEditCommunity(t)}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleDeleteCommunityLog(t)}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!communityTrainings || communityTrainings.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No community trainings logged yet. Click "Log Community Training" to record your impact.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingManagementPanel;
