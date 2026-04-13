import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrash } from "@/hooks/useTrash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Eye, FileText, ArrowLeft, GripVertical } from "lucide-react";
import { format } from "date-fns";

type FieldType = "text" | "email" | "number" | "textarea" | "select" | "checkbox" | "date" | "phone";

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for select fields
  placeholder?: string;
}

interface FormData {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  is_active: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

type ViewMode = "list" | "create" | "edit" | "responses";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Number" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Long Text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
];

const FormBuilderPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("list");
  const [editingForm, setEditingForm] = useState<FormData | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // Form editor state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["admin-forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((f: any) => ({
        ...f,
        fields: (typeof f.fields === "string" ? JSON.parse(f.fields) : f.fields) as FormField[],
      })) as FormData[];
    },
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["form-responses", selectedFormId],
    queryFn: async () => {
      if (!selectedFormId) return [];
      const { data, error } = await supabase
        .from("form_responses")
        .select("*")
        .eq("form_id", selectedFormId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFormId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("forms").insert({
        user_id: user.id,
        title,
        description: description || null,
        fields: fields as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forms"] });
      toast.success("Form created successfully!");
      resetEditor();
      setView("list");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingForm) return;
      const { error } = await supabase
        .from("forms")
        .update({ title, description: description || null, fields: fields as any })
        .eq("id", editingForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forms"] });
      toast.success("Form updated!");
      resetEditor();
      setView("list");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("forms").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forms"] });
      toast.success("Form status updated");
    },
  });

  const { softDelete } = useTrash();
  const handleDeleteForm = async (form: any) => {
    const success = await softDelete("forms", form.id, form, form.title);
    if (success) queryClient.invalidateQueries({ queryKey: ["admin-forms"] });
  };

  const resetEditor = () => {
    setTitle("");
    setDescription("");
    setFields([]);
    setEditingForm(null);
  };

  const addField = () => {
    setFields([
      ...fields,
      { id: crypto.randomUUID(), label: "", type: "text", required: false },
    ]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const startEdit = (form: FormData) => {
    setEditingForm(form);
    setTitle(form.title);
    setDescription(form.description || "");
    setFields(form.fields);
    setView("edit");
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/form/${token}`;
  };

  const copyShareLink = (token: string) => {
    navigator.clipboard.writeText(getShareUrl(token));
    toast.success("Share link copied to clipboard!");
  };

  const viewResponses = (formId: string) => {
    setSelectedFormId(formId);
    setView("responses");
  };

  // --- Render ---

  if (view === "responses" && selectedFormId) {
    const form = forms.find((f) => f.id === selectedFormId);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedFormId(null); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h3 className="text-lg font-semibold">Responses: {form?.title}</h3>
          <Badge variant="secondary">{responses.length} responses</Badge>
        </div>
        {responses.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No responses yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {responses.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {r.respondent_name && <p className="font-medium">{r.respondent_name}</p>}
                      {r.respondent_email && <p className="text-sm text-muted-foreground">{r.respondent_email}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PPp")}</span>
                  </div>
                  <div className="grid gap-2">
                    {form?.fields.map((field) => {
                      const answers = typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers;
                      return (
                        <div key={field.id} className="grid grid-cols-3 gap-2 text-sm">
                          <span className="font-medium text-muted-foreground">{field.label}:</span>
                          <span className="col-span-2">{String(answers[field.id] ?? "—")}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === "create" || view === "edit") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { resetEditor(); setView("list"); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h3 className="text-lg font-semibold">{view === "create" ? "Create New Form" : "Edit Form"}</h3>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Form Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Waste Picker Registration" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Fields ({fields.length})</h4>
          <Button size="sm" onClick={addField}><Plus className="w-4 h-4 mr-1" /> Add Field</Button>
        </div>

        {fields.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No fields yet. Click "Add Field" to start building your form.</CardContent></Card>
        )}

        <div className="space-y-3">
          {fields.map((field, idx) => (
            <Card key={field.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 mt-3 text-muted-foreground shrink-0" />
                  <div className="flex-1 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Field Label *</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="e.g. Full Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Field Type</Label>
                      <Select value={field.type} onValueChange={(v) => updateField(field.id, { type: v as FieldType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((ft) => (
                            <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {field.type === "select" && (
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs">Options (comma-separated)</Label>
                        <Input
                          value={(field.options || []).join(", ")}
                          onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                          placeholder="Option A, Option B, Option C"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        value={field.placeholder || ""}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        placeholder="Placeholder text"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(v) => updateField(field.id, { required: v })}
                      />
                      <Label className="text-xs">Required</Label>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => removeField(field.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => view === "edit" ? updateMutation.mutate() : createMutation.mutate()}
            disabled={!title.trim() || fields.length === 0 || fields.some((f) => !f.label.trim())}
          >
            {view === "edit" ? "Save Changes" : "Create Form"}
          </Button>
          <Button variant="outline" onClick={() => { resetEditor(); setView("list"); }}>Cancel</Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Forms</h3>
        <Button onClick={() => setView("create")}><Plus className="w-4 h-4 mr-1" /> Create Form</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : forms.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No forms yet. Create your first form to start collecting data.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <h4 className="font-semibold truncate">{form.title}</h4>
                      <Badge variant={form.is_active ? "default" : "secondary"}>
                        {form.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {form.description && <p className="text-sm text-muted-foreground mb-2">{form.description}</p>}
                    <p className="text-xs text-muted-foreground">{form.fields.length} fields • Created {format(new Date(form.created_at), "PP")}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => toggleActiveMutation.mutate({ id: form.id, is_active: v })}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => startEdit(form)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => viewResponses(form.id)}>
                    <Eye className="w-3 h-3 mr-1" /> Responses
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyShareLink(form.share_token)}>
                    <Copy className="w-3 h-3 mr-1" /> Copy Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(getShareUrl(form.share_token), "_blank")}>
                    <Eye className="w-3 h-3 mr-1" /> Preview
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteForm(form)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormBuilderPanel;
