import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CleanupRegister = () => {
  const { id } = useParams<{ id: string }>();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [cleanupTitle, setCleanupTitle] = useState("");

  const handleRegister = async () => {
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("register-cleanup-participant", {
        body: {
          cleanupId: id,
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          organizationName: organizationName.trim() || undefined,
          roleTitle: roleTitle.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });

      if (fnError) throw new Error(fnError.message || "Registration failed");
      if (data?.error) throw new Error(data.error);

      setCleanupTitle(data.cleanupTitle || "");
      setRegistered(true);
      toast.success("Successfully registered!");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/pwa-icon-192.png" alt="Twende Green Ecocycle" className="w-8 h-8" />
            <span className="text-2xl font-bold font-display text-foreground">Twende Green Ecocycle</span>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">Registration Successful!</h2>
              <p className="text-muted-foreground">
                Thank you, <strong>{fullName}</strong>! You have been registered for
                {cleanupTitle ? ` "${cleanupTitle}"` : " the cleanup exercise"}.
              </p>
              <p className="text-sm text-muted-foreground">
                We look forward to seeing you at the event.
              </p>
            </CardContent>
          </Card>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Learn more about Twende Green Ecocycle
          </Link>
          <p className="text-xs text-muted-foreground">
            © Twende Green Ecocycle · Circular Economy Traceability Platform
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/pwa-icon-192.png" alt="Twende Green Ecocycle" className="w-8 h-8" />
            <span className="text-2xl font-bold font-display text-foreground">Twende Green Ecocycle</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Cleanup Exercise Registration</h1>
          <p className="text-sm text-muted-foreground">
            Register your attendance for this cleanup exercise.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Participant Registration
            </CardTitle>
            <CardDescription>
              Fill in your details to register for the cleanup event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Full Name *</Label>
              <Input
                id="reg-name"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">Email Address</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-phone">Phone Number</Label>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-org">Organization</Label>
              <Input
                id="reg-org"
                placeholder="Your organization or company"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-role">Role / Title</Label>
              <Input
                id="reg-role"
                placeholder="e.g. Volunteer, Manager, Community Leader"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-notes">Additional Notes</Label>
              <Textarea
                id="reg-notes"
                placeholder="Any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleRegister}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? "Registering…" : "Register for Cleanup"}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Learn more about Twende Green Ecocycle
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          © Twende Green Ecocycle · Circular Economy Traceability Platform
        </p>
      </div>
    </div>
  );
};

export default CleanupRegister;
