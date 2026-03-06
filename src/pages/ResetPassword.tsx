import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    // Only run once
    if (verified) return;

    let cancelled = false;

    const verifyToken = async () => {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (tokenHash && type === "recovery") {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (cancelled) return;
          if (error) {
            console.error("Token verification failed:", error.message);
            setLinkError("Invalid or expired reset link. Please request a new one.");
            setReady(false);
            setChecking(false);
            return;
          }
          setVerified(true);
          setReady(true);
          setChecking(false);
          return;
        } catch (err) {
          if (cancelled) return;
          console.error("Token verification error:", err);
          setLinkError("Invalid or expired reset link. Please request a new one.");
          setReady(false);
          setChecking(false);
          return;
        }
      }

      // Fallback: check for hash fragment (old Supabase redirect flow)
      const hash = window.location.hash;
      if (hash && (hash.includes("type=recovery") || hash.includes("access_token"))) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event) => {
            if (event === "PASSWORD_RECOVERY") {
              setVerified(true);
              setReady(true);
              setChecking(false);
              subscription.unsubscribe();
            }
          }
        );
        setTimeout(() => {
          if (cancelled) { subscription.unsubscribe(); return; }
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (cancelled) return;
            if (session) {
              setVerified(true);
              setReady(true);
              setChecking(false);
            } else {
              setChecking(false);
              setLinkError("Invalid or expired reset link. Please request a new one.");
              setReady(false);
              setChecking(false);
            }
          });
          subscription.unsubscribe();
        }, 3000);
        return;
      }

      // No token — check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setVerified(true);
        setReady(true);
        setChecking(false);
      } else {
        setChecking(false);
        setLinkError("Invalid or expired reset link. Please request a new one.");
        setReady(false);
        setChecking(false);
      }
    };

    verifyToken();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated successfully!" });
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Reset link invalid</h2>
          <p className="text-muted-foreground mb-6">{linkError}</p>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Request New Reset Link</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Set New Password</h2>
        <p className="text-muted-foreground mb-6">Enter your new password below.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm your password" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
