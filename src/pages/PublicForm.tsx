import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

const PublicForm = () => {
  const { token } = useParams<{ token: string }>();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading, error } = useQuery({
    queryKey: ["public-form", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("share_token", token)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Form not found");
      return {
        ...data,
        fields: (typeof data.fields === "string" ? JSON.parse(data.fields) : data.fields) as FormField[],
      };
    },
    enabled: !!token,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;
      // Validate required fields
      for (const field of form.fields) {
        if (field.required && !answers[field.id]) {
          throw new Error(`"${field.label}" is required`);
        }
      }
      const { error } = await supabase.from("form_responses").insert({
        form_id: form.id,
        respondent_name: respondentName || null,
        respondent_email: respondentEmail || null,
        answers: answers as any,
      });
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => toast.error(e.message),
  });

  const updateAnswer = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={answers[field.id] || ""}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );
      case "select":
        return (
          <Select value={answers[field.id] || ""} onValueChange={(v) => updateAnswer(field.id, v)}>
            <SelectTrigger><SelectValue placeholder={field.placeholder || "Select..."} /></SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={answers[field.id] || false}
              onCheckedChange={(v) => updateAnswer(field.id, v)}
            />
            <span className="text-sm">{field.placeholder || "Yes"}</span>
          </div>
        );
      default:
        return (
          <Input
            type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "phone" ? "tel" : field.type === "date" ? "date" : "text"}
            value={answers[field.id] || ""}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">This form is no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Thank You!</h2>
            <p className="text-muted-foreground">Your response has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Logo Header */}
        <div className="text-center">
          <img
            src="/images/duara-flow-logo.svg"
            alt="Duara Flow"
            className="h-16 mx-auto mb-4"
          />
        </div>

        {/* Form Header */}
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-2">{form.title}</h1>
            {form.description && <p className="text-muted-foreground">{form.description}</p>}
          </CardContent>
        </Card>

        {/* Respondent Info */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input value={respondentName} onChange={(e) => setRespondentName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label>Your Email</Label>
              <Input type="email" value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} placeholder="Enter your email" />
            </div>
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardContent className="p-6 space-y-5">
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? "Submitting..." : "Submit"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">Powered by Duara Flow</p>
      </div>
    </div>
  );
};

export default PublicForm;
