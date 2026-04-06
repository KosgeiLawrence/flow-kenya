import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PLAN_AMOUNT_MAP, isFreePlan } from "@/lib/stripePlans";
import { pricingData, isPromoValidForRole } from "@/components/auth/PricingPlans";

const Payment = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const cancelled = searchParams.get("cancelled") === "true";

  const selectedPlan = user?.user_metadata?.selected_plan || "";
  const promoCode = user?.user_metadata?.promo_code || "";
  const roleStr = role as "waste_picker" | "aggregator" | "recycler" | "ngo" | "corporate" | "county_government" | null;
  const promoValid = promoCode ? isPromoValidForRole(promoCode, roleStr) : false;
  const freePlan = isFreePlan(selectedPlan);

  // Find plan details
  const allPlans = Object.values(pricingData).flat();
  const planDetails = allPlans.find((p) => p.id === selectedPlan);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (freePlan || promoValid) {
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
  }, [user, role, freePlan, promoValid, navigate]);

  const handleCheckout = async () => {
    const amount = PLAN_AMOUNT_MAP[selectedPlan];
    if (!amount || amount <= 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          amount,
          planId: selectedPlan,
          planName: planDetails?.name || selectedPlan,
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

  const amount = PLAN_AMOUNT_MAP[selectedPlan];
  const hasPaidPlan = amount !== undefined && amount > 0;

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

          {planDetails && (
            <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-foreground">{planDetails.name}</p>
                  <p className="text-sm text-muted-foreground">Selected Plan</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">
                    {planDetails.price}
                  </p>
                  {planDetails.period && (
                    <p className="text-xs text-muted-foreground">{planDetails.period}</p>
                  )}
                </div>
              </div>
              <ul className="mt-3 space-y-1">
                {planDetails.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={loading || !hasPaidPlan}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Pay with IntaSend
          </Button>

          {!hasPaidPlan && (
            <p className="text-center text-sm text-muted-foreground">
              This plan requires custom pricing. Please contact us.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payment;
