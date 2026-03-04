import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Specific admin bypasses payment
    if (user.email === "kplowren@yahoo.com") {
      return new Response(JSON.stringify({ subscribed: true, free_plan: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = user.user_metadata;

    // Check if user has a free plan (waste_picker basic or enterprise/custom plans)
    const selectedPlan = meta?.selected_plan;
    const freePlans = ["wp_basic", "agg_enterprise", "rec_enterprise", "county_smart"];
    if (freePlans.includes(selectedPlan)) {
      return new Response(JSON.stringify({ subscribed: true, free_plan: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check promo code in user metadata (role-aware)
    const promoCode = meta?.promo_code;
    const userRole = meta?.role;
    const generalPromos = ["PILOT2026", "COASTALPARTNER", "EARLYADOPTER", "MOMBASAPILOT"];
    const ngoCorpCountyPromos = ["SOCIALCHANGE10", "CIRCULARNGO20"];
    const ngoCorpCountyRoles = ["ngo", "corporate", "county_government"];

    if (promoCode) {
      const upper = promoCode.toUpperCase();
      const isValid = ngoCorpCountyRoles.includes(userRole)
        ? ngoCorpCountyPromos.includes(upper)
        : generalPromos.includes(upper);

      if (isValid) {
        return new Response(JSON.stringify({ subscribed: true, promo: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let productId = null;

    if (hasActiveSub) {
      const sub = subscriptions.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      productId = sub.items.data[0].price.product;
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
