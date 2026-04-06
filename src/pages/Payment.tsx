import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAmount, BILLING_LABELS, BillingPeriod, ROLE_PRICING } from "@/lib/stripePlans";
import { isPromoValidForRole } from "@/components/auth/PricingPlans";

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
  const [checking, setChecking] = useState(true);

  const cancelled = searchParams.get("cancelled") === "true";

  const roleStr = (role || user?.user_metadata?.role || "") as string;
  const billingPeriod = (user?.user_metadata?.billing_period || "monthly") as BillingPeriod;
  const promoCode = user?.user_metadata?.promo_code || "";
  const promoValid = promoCode ? isPromoValidForRole(promoCode, roleStr as any) : false;
  const amount = getAmount(roleStr, billingPeriod);
  const features = ROLE_FEATURES[roleStr] || [];

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (promoValid) {
      if (role) {
        navigate(`/dashboard/${role.replace("_", "-")}`, { replace: true });
      }
      setChecking(false);
      return;
    }

    const checkSub = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (!error && data?.subscribed) {
          if (role) {
            navigate(`/dashboard/${role.replace("_", "-")}`, { replace: true });
          }
          return;
        }
      } catch (e) {
        console.error("Subscription check failed:", e);
      }
      setChecking(false);
    };
    checkSub();
  }, [user, role, promoValid, navigate]);

  const handleCheckout = async () => {
    if (!amount || amount <= 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          amount,
          role: roleStr,
          billingPeriod,
          promoCode,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      console.error("Checkout error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CreditCard className="w-12 h-12 mx-auto text-primary mb-2" />
          <CardTitle className="text-2xl font-display">Complete Your Subscription</CardTitle>
          <CardDescription>
            Pay via M-Pesa or Card to activate your plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {cancelled && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Payment was cancelled. You can try again below.
            </div>
          )}

          <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground capitalize">{roleStr.replace(/_/g, " ")}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {billingPeriod.replace("_", "-")} plan
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">
                  {promoValid ? (
                    <>
                      <span className="line-through text-muted-foreground text-sm mr-1">{formatKES(amount)}</span>
                      <span className="text-emerald-600">Free</span>
                    </>
                  ) : (
                    formatKES(amount)
                  )}
                </p>
                {!promoValid && (
                  <p className="text-xs text-muted-foreground">{BILLING_LABELS[billingPeriod]}</p>
                )}
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={loading || !amount || amount <= 0}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Pay with IntaSend
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payment;
