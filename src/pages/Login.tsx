import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      const role = roleData?.role || "waste_picker";
      navigate(`/dashboard/${role.replace("_", "-")}`, { replace: true });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6 relative">
      {/* Decorative gradient blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 h-[50%] w-[50%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[40%] w-[40%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Close button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 right-6 p-2 rounded-full glass hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-smooth z-10"
        aria-label={t("auth.close")}
      >
        <X className="w-5 h-5" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <img
              src="/images/duara-flow-logo.svg"
              alt="Duara Flow"
              className="h-10 mx-auto mb-4"
            />
            <h2 className="text-2xl font-display font-bold text-foreground">
              {t("nav.signIn")}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t("auth.signInSubtitle")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline transition-smooth"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {loading ? t("auth.signingIn") : t("nav.signIn")}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.noAccount")}{" "}
          <Link
            to="/signup"
            className="text-primary font-medium hover:underline"
          >
            {t("auth.signUp")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
