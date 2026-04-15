import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ConsultationDialogProps {
  children: React.ReactNode;
}

const interestKeys = [
  "wastePickerReg",
  "aggregatorOnboarding",
  "recyclerPartnership",
  "corporateEPR",
  "ngoCollab",
  "countyIntegration",
  "platformDemo",
  "pricingPlans",
  "other",
] as const;

const ConsultationDialog = ({ children }: ConsultationDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    interest: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.interest || !form.message.trim()) {
      toast.error(t("consultationInterests.fillRequired"));
      return;
    }
    setLoading(true);
    try {
      const interestLabel = t(`consultationInterests.${form.interest}`);
      const { error } = await supabase.from("contact_messages").insert({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        subject: `Free Consultation — ${interestLabel}`,
        message: `Phone: ${form.phone || "N/A"}\nInterest: ${interestLabel}\n\n${form.message}`,
      });
      if (error) throw error;
      toast.success(t("consultationInterests.submitSuccess"));
      setForm({ full_name: "", email: "", phone: "", interest: "", message: "" });
      setOpen(false);
    } catch {
      toast.error(t("consultationInterests.submitError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("consultation.title")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t("consultation.subtitle")}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cons-name">{t("consultation.name")} *</Label>
              <Input
                id="cons-name"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cons-email">{t("consultation.email")} *</Label>
              <Input
                id="cons-email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={255}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cons-phone">{t("consultation.phone")}</Label>
              <Input
                id="cons-phone"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("consultation.interest")} *</Label>
              <Select value={form.interest} onValueChange={(v) => setForm({ ...form, interest: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("consultationInterests.selectArea")} />
                </SelectTrigger>
                <SelectContent>
                  {interestKeys.map((key) => (
                    <SelectItem key={key} value={key}>{t(`consultationInterests.${key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cons-msg">{t("consultation.message")} *</Label>
            <Textarea
              id="cons-msg"
              placeholder={t("consultation.message")}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={1000}
              rows={4}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("consultation.submit")}
          </Button>
          <p className="text-xs text-center text-muted-foreground">{t("consultation.note")}</p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationDialog;
