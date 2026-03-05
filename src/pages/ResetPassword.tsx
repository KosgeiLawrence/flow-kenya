import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event which fires when
    // Supabase processes the recovery token from the URL hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
          setChecking(false);
        } else if (event === "SIGNED_IN" && session) {
          // User may already have a session from a previously exchanged token
          setReady(true);
          setChecking(false);
        }
      }
    );

    // Also check if there's already a valid session (e.g. page refresh after token exchange)
    const checkSession = async () => {
      const hash = window.location.hash;
      // If the hash contains recovery params, the onAuthStateChange will handle it
      if (hash && (hash.includes("type=recovery") || hash.includes("access_token"))) {
        // Give Supabase client time to process the hash
        return;
      }

      // No hash — check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        setChecking(false);
      } else {
        // No session, no recovery hash — redirect to login
        setChecking(false);
        toast({
          title: "Invalid or expired reset link",
          description: "Please request a new password reset.",
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
    };

    // Delay the session check to give onAuthStateChange time to fire first
    const timer = setTimeout(checkSession, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate, toast]);

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
      // Sign out so user logs in fresh with new password
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

  if (!ready) {
    return null; // Will redirect via useEffect
  }

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
