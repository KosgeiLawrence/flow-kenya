import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_PRICING: Record<string, { monthly: number; yearly: number; one_time: number }> = {
  waste_picker: { monthly: 250, yearly: 2550, one_time: 5800 },
  aggregator: { monthly: 250, yearly: 2550, one_time: 5800 },
  recycler: { monthly: 300, yearly: 3060, one_time: 7000 },
  ngo: { monthly: 650, yearly: 6600, one_time: 14500 },
  corporate: { monthly: 1300, yearly: 13200, one_time: 29000 },
  county_government: { monthly: 25000, yearly: 255000, one_time: 510000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { amount, role, billingPeriod, promoCode } = await req.json();
    if (!amount || !role || !billingPeriod) throw new Error("amount, role, and billingPeriod are required");

    // Validate amount matches expected pricing
    const pricing = ROLE_PRICING[role];
    if (!pricing) throw new Error("Invalid role");
    const expectedAmount = pricing[billingPeriod as keyof typeof pricing];
    if (expectedAmount !== amount) throw new Error("Amount mismatch");

    const publishableKey = Deno.env.get("INTASEND_PUBLISHABLE_KEY");
    if (!publishableKey) throw new Error("INTASEND_PUBLISHABLE_KEY is not set");

    const origin = "https://flow-kenya-trace.lovable.app";

    const periodLabel = billingPeriod === "monthly" ? "Monthly" : billingPeriod === "yearly" ? "Yearly" : "Lifetime";
    const roleName = role.replace(/_/g, " ");

    const response = await fetch("https://api.intasend.com/api/v1/checkout/", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
        "X-IntaSend-Public-API-Key": publishableKey,
      },
      body: JSON.stringify({
        amount: amount,
        currency: "KES",
        email: user.email,
        first_name: user.user_metadata?.full_name?.split(" ")[0] || "",
        last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
        host: origin,
        channel: "WEBSITE",
        api_ref: `${role}__${billingPeriod}__${user.id}`,
        comment: `Duara Flow ${periodLabel} - ${roleName}`,
        redirect_url: `${origin}/payment`,
        mobile_tarrif: "BUSINESS-PAYS",
        card_tarrif: "BUSINESS-PAYS",
      }),
    });

    const checkoutData = await response.json();

    if (!response.ok) {
      console.error("IntaSend error:", JSON.stringify(checkoutData));
      throw new Error(`IntaSend checkout failed [${response.status}]: ${JSON.stringify(checkoutData)}`);
    }

    return new Response(JSON.stringify({ url: checkoutData.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
