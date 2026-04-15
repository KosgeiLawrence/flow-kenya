import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type PageState = "verifying" | "ready" | "success" | "error";

const CenterWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
      <div className="glass-card rounded-2xl p-8">{children}</div>
    </motion.div>
  </div>
);

const ResetPassword = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageState, setPageState] = useState<PageState>("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const didVerify = useRef(false);

  useEffect(() => {
    if (didVerify.current) return;
    didVerify.current = true;

    const verifyToken = async () => {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (error) { setErrorMessage("This reset link has expired or has already been used."); setPageState("error"); return; }
        setPageState("ready"); return;
      }

      const hash = window.location.hash;
      if (hash && (hash.includes("type=recovery") || hash.includes("access_token"))) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { setPageState("ready"); } else { setErrorMessage("This reset link has expired or has already been used."); setPageState("error"); }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setPageState("ready"); } else { setErrorMessage("No valid reset token found. Please request a new password reset link."); setPageState("error"); }
    };
    verifyToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (password.length < 8) { toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setPageState("success");
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };


  if (pageState === "verifying") return (
    <CenterWrapper>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verifying your reset link…</p>
      </div>
    </CenterWrapper>
  );

  if (pageState === "error") return (
    <CenterWrapper>
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Reset Link Invalid</h2>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>
        <Button asChild className="w-full"><Link to="/forgot-password">Request New Reset Link</Link></Button>
      </div>
    </CenterWrapper>
  );

  if (pageState === "success") return (
    <CenterWrapper>
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Password Updated!</h2>
        <p className="text-muted-foreground mb-6">Your password has been changed successfully. You can now sign in with your new password.</p>
        <Button asChild className="w-full"><Link to="/login">Go to Login</Link></Button>
      </div>
    </CenterWrapper>
  );

  return (
    <CenterWrapper>
      <h2 className="text-2xl font-display font-bold text-foreground mb-2">Set New Password</h2>
      <p className="text-muted-foreground mb-6">Enter your new password below.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm your password" required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Update Password
        </Button>
      </form>
    </CenterWrapper>
  );
};

export default ResetPassword;
