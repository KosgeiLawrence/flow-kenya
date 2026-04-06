import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { amount, planId, planName, promoCode } = await req.json();
    if (!amount || !planId) throw new Error("amount and planId are required");

    const publishableKey = Deno.env.get("INTASEND_PUBLISHABLE_KEY");
    if (!publishableKey) throw new Error("INTASEND_PUBLISHABLE_KEY is not set");

    const origin = req.headers.get("origin") || "https://flow-kenya-trace.lovable.app";

    // Create IntaSend checkout
    const response = await fetch("https://payment.intasend.com/api/v1/checkout/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IntaSend-Public-API-Key": publishableKey,
      },
      body: JSON.stringify({
        amount: amount,
        currency: "KES",
        email: user.email,
        first_name: user.user_metadata?.full_name?.split(" ")[0] || "",
        last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
        api_ref: `${planId}__${user.id}`,
        comment: `Subscription: ${planName || planId}`,
        redirect_url: `${origin}/dashboard?payment=success&plan=${planId}`,
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
