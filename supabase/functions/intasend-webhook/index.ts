import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_PRICING: Record<string, { monthly: number; yearly: number; one_time: number }> = {
  waste_picker: { monthly: 250, yearly: 2550, one_time: 5800 },
  aggregator: { monthly: 250, yearly: 2550, one_time: 5800 },
  recycler: { monthly: 300, yearly: 3060, one_time: 7000 },
  ngo: { monthly: 650, yearly: 6600, one_time: 14500 },
  corporate: { monthly: 1300, yearly: 13200, one_time: 29000 },
  county_government: { monthly: 25000, yearly: 255000, one_time: 510000 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const payload = await req.json();

    // 1. Verify the shared challenge value configured in the IntaSend dashboard
    const expectedChallenge = Deno.env.get("INTASEND_WEBHOOK_CHALLENGE");
    if (expectedChallenge && payload?.challenge !== expectedChallenge) {
      console.error("Webhook challenge mismatch");
      return json({ error: "invalid_challenge" }, 401);
    }

    const invoiceId: string | undefined = payload?.invoice_id;
    const apiRef: string | undefined = payload?.api_ref;
    if (!invoiceId || !apiRef) return json({ error: "missing invoice_id or api_ref" }, 400);

    // 2. Re-verify the payment state directly with IntaSend (never trust the body alone)
    const secretKey = Deno.env.get("INTASEND_SECRET_KEY");
    let state: string = payload?.state ?? "";
    let verifiedAmount: number | null = payload?.value ? Number(payload.value) : null;

    if (secretKey) {
      try {
        const res = await fetch("https://payment.intasend.com/api/v1/payment/status/", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${secretKey}`,
          },
          body: JSON.stringify({ invoice_id: invoiceId }),
        });
        const statusData = await res.json();
        const inv = statusData?.invoice ?? statusData;
        if (res.ok && inv?.state) {
          state = inv.state;
          if (inv.value != null) verifiedAmount = Number(inv.value);
        } else {
          console.error("IntaSend status check non-ok:", res.status, JSON.stringify(statusData));
        }
      } catch (e) {
        console.error("IntaSend status check failed, falling back to payload state:", e);
      }
    }

    // api_ref format: role__billingPeriod__userId
    const [role, billingPeriod, userId] = apiRef.split("__");
    const pricing = ROLE_PRICING[role];
    if (!pricing || !userId) {
      console.error("Unrecognised api_ref:", apiRef);
      return json({ error: "invalid_api_ref" }, 400);
    }
    const expectedAmount = pricing[billingPeriod as keyof typeof pricing];
    if (expectedAmount == null) return json({ error: "invalid_billing_period" }, 400);

    // 3. Locate the pending payment row (idempotency anchor)
    const { data: existing } = await admin
      .from("payments")
      .select("id, status, user_id, amount")
      .eq("checkout_request_id", invoiceId)
      .maybeSingle();

    if (existing?.status === "completed") {
      console.log("Payment already completed, skipping:", invoiceId);
      return json({ received: true, idempotent: true });
    }

    const succeeded = state === "COMPLETE";
    const failed = ["FAILED", "CANCELLED", "REFUNDED"].includes(state);

    if (!succeeded && !failed) {
      // PENDING / PROCESSING / RETRY — record nothing terminal
      console.log("Non-terminal state, ignoring:", state, invoiceId);
      return json({ received: true, state });
    }

    const roleName = role.replace(/_/g, " ");
    const periodLabel =
      billingPeriod === "monthly" ? "Monthly" : billingPeriod === "yearly" ? "Yearly" : "Lifetime";
    const newStatus = succeeded ? "completed" : "failed";

    if (existing) {
      await admin
        .from("payments")
        .update({
          status: newStatus,
          completed_at: succeeded ? new Date().toISOString() : null,
          result_description: succeeded ? "IntaSend payment confirmed" : (payload?.failed_reason ?? state),
          mpesa_receipt_number: payload?.mpesa_reference ?? null,
        })
        .eq("id", existing.id)
        .neq("status", "completed");
    } else {
      await admin.from("payments").insert({
        user_id: userId,
        amount: verifiedAmount ?? expectedAmount,
        phone_number: payload?.account ?? "",
        status: newStatus,
        description: `Subscription: ${roleName} - ${periodLabel}`,
        checkout_request_id: invoiceId,
        merchant_request_id: apiRef,
        completed_at: succeeded ? new Date().toISOString() : null,
        result_description: succeeded ? "IntaSend payment confirmed" : (payload?.failed_reason ?? state),
        mpesa_receipt_number: payload?.mpesa_reference ?? null,
      });
    }

    // 4. Failed / cancelled payments never activate a subscription
    if (!succeeded) {
      console.log("Payment not successful, subscription untouched:", invoiceId, state);
      return json({ received: true, state, activated: false });
    }

    // Guard against underpayment
    if (verifiedAmount != null && verifiedAmount + 0.01 < expectedAmount) {
      console.error("Underpayment, not activating:", verifiedAmount, "expected", expectedAmount);
      return json({ received: true, activated: false, reason: "amount_mismatch" });
    }

    // 5. Activate / extend the existing subscription
    const { data: activeSubs } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    const now = new Date();
    const current = activeSubs?.[0];
    const base =
      current?.expires_at && new Date(current.expires_at) > now ? new Date(current.expires_at) : now;

    let expiresAt: string | null = null;
    if (billingPeriod === "monthly") {
      const d = new Date(base);
      d.setMonth(d.getMonth() + 1);
      expiresAt = d.toISOString();
    } else if (billingPeriod === "yearly") {
      const d = new Date(base);
      d.setFullYear(d.getFullYear() + 1);
      expiresAt = d.toISOString();
    } // one_time -> null (never expires)

    const subRow = {
      user_id: userId,
      plan_name: roleName.replace(/\b\w/g, (c: string) => c.toUpperCase()),
      plan_tier: billingPeriod,
      price_kes: expectedAmount,
      status: "active",
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    if (current) {
      await admin.from("subscriptions").update(subRow).eq("id", current.id);
    } else {
      await admin.from("subscriptions").insert({ ...subRow, started_at: now.toISOString() });
    }

    console.log("Subscription activated for", userId, billingPeriod, expiresAt);
    return json({ received: true, activated: true });
  } catch (error) {
    console.error("IntaSend webhook error:", (error as Error).message);
    return json({ error: (error as Error).message }, 500);
  }
});
