import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        {sent ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground">We've sent a password reset link to <strong>{email}</strong></p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Reset Password</h2>
            <p className="text-muted-foreground mb-6">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Send Reset Link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
