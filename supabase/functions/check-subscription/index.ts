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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "user_not_found", subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Bypass emails
    const bypassEmails = [
      "kplowren@yahoo.com",
      "wastepicker@email.com",
      "aggregator@email.com",
      "recycler@email.com",
      "ngo@email.com",
      "corporate@email.com",
      "county@email.com",
      "lagatolivia7@gmail.com",
    ];
    if (bypassEmails.includes(user.email)) {
      return new Response(JSON.stringify({ subscribed: true, free_plan: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = user.user_metadata;

    // Check promo code
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

    // Check if user is an active team member — inherit inviter's subscription
    const { data: teamMembership } = await supabaseClient
      .from("team_members")
      .select("invited_by")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (teamMembership && teamMembership.length > 0) {
      const inviterId = teamMembership[0].invited_by;

      // Check if inviter has bypass email
      const { data: inviterData } = await supabaseClient.auth.admin.getUserById(inviterId);
      const inviterEmail = inviterData?.user?.email;
      if (inviterEmail && bypassEmails.includes(inviterEmail)) {
        return new Response(JSON.stringify({ subscribed: true, team_member: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if inviter has promo code
      const inviterMeta = inviterData?.user?.user_metadata;
      if (inviterMeta?.promo_code) {
        const upper = inviterMeta.promo_code.toUpperCase();
        const inviterRole = inviterMeta?.role;
        const isValid = ngoCorpCountyRoles.includes(inviterRole)
          ? ngoCorpCountyPromos.includes(upper)
          : generalPromos.includes(upper);
        if (isValid) {
          return new Response(JSON.stringify({ subscribed: true, team_member: true, promo: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Check if inviter has active subscription
      const { data: inviterSubs } = await supabaseClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", inviterId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (inviterSubs && inviterSubs.length > 0) {
        const sub = inviterSubs[0];
        if (sub.plan_tier === "one_time" || !sub.expires_at || new Date(sub.expires_at) > new Date()) {
          return new Response(JSON.stringify({ subscribed: true, team_member: true, plan_name: sub.plan_name }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Check subscriptions table for active subscription
    const { data: subs } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (subs && subs.length > 0) {
      const sub = subs[0];
      // one_time plans never expire
      if (sub.plan_tier === "one_time") {
        return new Response(JSON.stringify({
          subscribed: true,
          plan_name: sub.plan_name,
          plan_tier: sub.plan_tier,
          billing_period: "one_time",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Monthly/yearly: check expiry
      if (!sub.expires_at || new Date(sub.expires_at) > new Date()) {
        return new Response(JSON.stringify({
          subscribed: true,
          plan_name: sub.plan_name,
          plan_tier: sub.plan_tier,
          billing_period: sub.plan_tier,
          subscription_end: sub.expires_at,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Subscription expired — mark as expired
      await supabaseClient
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", sub.id);
    }

    return new Response(JSON.stringify({ subscribed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
