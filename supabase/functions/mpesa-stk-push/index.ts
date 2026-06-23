import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) throw new Error("Unauthorized");

    const user = claimsData.user;
    if (!user.email) throw new Error("User email not found");

    const { amount, role, billingPeriod, phoneNumber } = await req.json();

    // Validate inputs
    if (!amount || !role || !billingPeriod || !phoneNumber) {
      throw new Error("amount, role, billingPeriod, and phoneNumber are required");
    }

    // Validate amount matches expected pricing
    const pricing = ROLE_PRICING[role];
    if (!pricing) throw new Error("Invalid role");
    const expectedAmount = pricing[billingPeriod as keyof typeof pricing];
    if (expectedAmount !== amount) throw new Error("Amount mismatch");

    // Format phone number to 254 format
    let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("+254")) {
      formattedPhone = formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    const secretKey = Deno.env.get("INTASEND_SECRET_KEY");
    if (!secretKey) throw new Error("INTASEND_SECRET_KEY is not set");

    const periodLabel = billingPeriod === "monthly" ? "Monthly" : billingPeriod === "yearly" ? "Yearly" : "Lifetime";
    const roleName = role.replace(/_/g, " ");
    const apiRef = `${role}__${billingPeriod}__${user.id}`;

    console.log("Initiating STK Push:", { phone: formattedPhone, amount, role, billingPeriod });

    // Call IntaSend STK Push API
    const response = await fetch("https://payment.intasend.com/api/v1/payment/mpesa-stk-push/", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: amount,
        phone_number: formattedPhone,
        api_ref: apiRef,
        narrative: `Duara Flow ${periodLabel} - ${roleName}`,
      }),
    });

    const stkData = await response.json();

    if (!response.ok) {
      console.error("IntaSend STK Push error:", JSON.stringify(stkData));
      throw new Error(
        `STK Push failed [${response.status}]: ${JSON.stringify(stkData)}`
      );
    }

    console.log("STK Push response:", JSON.stringify(stkData));

    // Store the STK push request in payments table for tracking
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await adminClient.from("payments").insert({
      user_id: user.id,
      phone_number: formattedPhone,
      amount: amount,
      status: "pending",
      description: `Subscription: ${roleName} - ${periodLabel}`,
      checkout_request_id: stkData.id || stkData.invoice?.invoice_id || null,
      merchant_request_id: apiRef,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "STK Push sent. Check your phone to complete payment.",
        invoice_id: stkData.id || stkData.invoice?.invoice_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("STK Push error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
