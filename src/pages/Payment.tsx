import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CreditCard, CheckCircle, AlertCircle, Smartphone, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAmount, BILLING_LABELS, BillingPeriod, ROLE_PRICING } from "@/lib/stripePlans";
import { isPromoValidForRole } from "@/components/auth/PricingPlans";
import { toast } from "sonner";

const ROLE_FEATURES: Record<string, string[]> = {
  waste_picker: ["Collection logging", "Payment tracking", "Analytics"],
  aggregator: ["Inventory tracking", "Waste picker management", "Analytics"],
  recycler: ["Inventory management", "Order tracking", "ESG reporting"],
  ngo: ["Program management", "Impact tracking", "Grant management"],
  corporate: ["Supplier tracking", "ESG reports", "Audit-ready docs"],
  county_government: ["Full dashboard", "Ward-level intelligence", "Compliance"],
};

const formatKES = (amount: number) => `KES ${amount.toLocaleString("en-KE")}`;

const Payment = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [stkLoading, setStkLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [stkSent, setStkSent] = useState(false);

  const cancelled = searchParams.get("cancelled") === "true";
  const roleStr = (role || user?.user_metadata?.role || "") as string;
  const billingPeriod = (user?.user_metadata?.billing_period || "monthly") as BillingPeriod;
  const isTrialUser = billingPeriod === "free_trial";
  const promoCode = user?.user_metadata?.promo_code || "";
  const promoValid = promoCode ? isPromoValidForRole(promoCode, roleStr as any) : false;
  const amount = getAmount(roleStr, billingPeriod);
  const features = ROLE_FEATURES[roleStr] || [];

  useEffect(() => { if (user?.user_metadata?.phone_number) setPhoneNumber(user.user_metadata.phone_number); }, [user]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (isTrialUser) { if (role) navigate(`/dashboard/${role.replace("_", "-")}`, { replace: true }); setChecking(false); return; }
    if (promoValid) { if (role) navigate(`/dashboard/${role.replace("_", "-")}`, { replace: true }); setChecking(false); return; }
    const checkSub = async () => {
      try { const { data, error } = await supabase.functions.invoke("check-subscription"); if (!error && data?.subscribed) { if (role) navigate(`/dashboard/${role.replace("_", "-")}`, { replace: true }); return; } } catch (e) { console.error("Subscription check failed:", e); }
      setChecking(false);
    };
    checkSub();
  }, [user, role, promoValid, isTrialUser, navigate]);

  const handleStkPush = async () => {
    if (!amount || amount <= 0 || !phoneNumber) return;
    setStkLoading(true); setStkSent(false);
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", { body: { amount, role: roleStr, billingPeriod, phoneNumber } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      setStkSent(true); toast.success("STK Push sent! Check your phone to complete payment.");
    } catch (e: any) { toast.error(e.message || "Failed to send STK Push. Try again."); }
    finally { setStkLoading(false); }
  };

  const handleCheckout = async () => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { amount, role: roleStr, billingPeriod, promoCode } });
      if (error) throw error; if (data?.url) window.location.href = data.url;
    } catch (e: any) { toast.error("Checkout failed. Try again."); }
    finally { setLoading(false); }
  };

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-mesh">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md glass-card rounded-2xl p-8"
      >
        <div className="text-center mb-6">
          <CreditCard className="w-12 h-12 mx-auto text-primary mb-2" />
          <h2 className="text-2xl font-display font-bold text-foreground">Complete Your Subscription</h2>
          <p className="text-sm text-muted-foreground mt-1">Pay via M-Pesa STK Push or Card to activate your plan</p>
        </div>

        <div className="space-y-6">
          {cancelled && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Payment was cancelled. You can try again below.
            </div>
          )}

          {/* Plan summary */}
          <div className="p-4 rounded-xl border-2 border-primary/30 glass">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground capitalize">{roleStr.replace(/_/g, " ")}</p>
                <p className="text-sm text-muted-foreground capitalize">{billingPeriod.replace("_", "-")} plan</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">
                  {promoValid ? (
                    <><span className="line-through text-muted-foreground text-sm mr-1">{formatKES(amount)}</span><span className="text-primary">Free</span></>
                  ) : formatKES(amount)}
                </p>
                {!promoValid && <p className="text-xs text-muted-foreground">{BILLING_LABELS[billingPeriod]}</p>}
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-primary shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>

          {/* M-Pesa */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Smartphone className="w-4 h-4 text-primary" /> Pay with M-Pesa (STK Push)
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="tel" placeholder="Phone number (e.g. 0712345678)" value={phoneNumber} onChange={(e) => { setPhoneNumber(e.target.value); setStkSent(false); }} className="pl-10" />
            </div>
            {stkSent && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                STK Push sent! Enter your M-Pesa PIN on your phone to complete.
              </div>
            )}
            <Button onClick={handleStkPush} disabled={stkLoading || !amount || amount <= 0 || !phoneNumber.trim()} className="w-full gap-2" size="lg">
              {stkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              {stkLoading ? "Sending STK Push..." : "Pay via M-Pesa"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button onClick={handleCheckout} disabled={loading || !amount || amount <= 0} variant="outline" className="w-full gap-2" size="lg">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Pay with Card / Other
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Payment;
