import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";

const JoinTeam = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [inviterProfile, setInviterProfile] = useState<any>(null);
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      // Use service role via edge function to validate token
      const { data, error: fnError } = await supabase.functions.invoke("validate-team-invite", {
        body: { token },
      });
      if (fnError || data?.error) {
        setError(data?.error || "Invalid or expired invitation");
        setLoading(false);
        return;
      }
      setInvitation(data.invitation);
      setInviterProfile(data.inviter);
      setOrgInfo(data.organization);
    } catch {
      setError("Failed to validate invitation");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("accept-team-invite", {
        body: {
          token,
          full_name: fullName.trim(),
          password,
        },
      });

      if (fnError || data?.error) {
        toast.error(data?.error || "Failed to join team");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      toast.success("Welcome to the team!");

      // Auto-login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (!signInError) {
        const rolePath = invitation.role.replace(/_/g, "-");
        setTimeout(() => navigate(`/dashboard/${rolePath}`), 1500);
      }
    } catch {
      toast.error("Something went wrong");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">You're In!</h2>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = invitation?.role?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <img src="/images/duara-flow-logo.svg" alt="Twende Green Ecocycle" className="h-10 mx-auto mb-4" />
          {orgInfo?.logo_url && (
            <img src={orgInfo.logo_url} alt={orgInfo.name} className="h-12 mx-auto mb-2 rounded" />
          )}
          {orgInfo?.name && (
            <p className="text-sm font-medium text-muted-foreground">{orgInfo.name}</p>
          )}
          <CardTitle className="text-xl mt-2">
            <Users className="w-5 h-5 inline mr-2 text-primary" />
            Join {inviterProfile?.full_name || "the"} Team
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            You've been invited as a <strong>{roleLabel}</strong>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={invitation?.email || ""} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 chars)"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Join Team & Access Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinTeam;
