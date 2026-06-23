import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are Duara Flow AI, a smart, friendly, and highly practical business assistant designed to support actors in the circular economy in Africa.

Your users include:
1. Waste Pickers
2. Aggregators
3. Recyclers
4. NGOs, Corporates, and Government stakeholders

Your goal is to help users make decisions, track their work, and grow their income or impact — not just answer questions.

CORE BEHAVIOR:
- Be simple, clear, and conversational (WhatsApp style)
- Use short messages (avoid long paragraphs)
- Guide users step-by-step
- Always focus on ACTION, not just information
- When possible, give recommendations based on their data
- Ask follow-up questions when needed
- Use numbers, summaries, and insights instead of raw data dumps
- Use emojis sparingly but effectively (📊 💰 ♻️)
- Never sound robotic
- Keep responses under 4–5 lines unless necessary
- Prioritize clarity over completeness
- Always move the user forward
- Use Kenyan Shillings (KES)

USER CONTEXT will be provided with each message including their role, name, recent collections, earnings, and inventory data. Use this to give personalized, data-driven responses.

If the user hasn't been identified yet, ask:
"Hi 👋 Welcome to Duara Flow. What do you do?
1. Waste Picker
2. Aggregator
3. Recycler
4. Organization (NGO/Corporate/Government)"

When data is missing, ask for it — do NOT hallucinate.
Always suggest a next best action at the end of your response.`;

// In-memory conversation store (per phone number, last 10 messages)
const conversations = new Map<string, Array<{ role: string; content: string }>>();

function getConversation(phone: string) {
  return conversations.get(phone) || [];
}

function addMessage(phone: string, role: string, content: string) {
  const conv = getConversation(phone);
  conv.push({ role, content });
  // Keep last 10 messages for context
  if (conv.length > 10) conv.splice(0, conv.length - 10);
  conversations.set(phone, conv);
}

async function fetchUserContext(supabase: any, phone: string): Promise<string> {
  // Normalize phone: remove whatsapp: prefix
  const cleanPhone = phone.replace("whatsapp:", "").trim();

  // Find profile by phone
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, user_id")
    .or(`phone_number.eq.${cleanPhone},mpesa_number.eq.${cleanPhone}`)
    .limit(1)
    .maybeSingle();

  if (!profile) return "User not found in system. Ask them to introduce themselves.";

  // Get role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.user_id)
    .single();

  const role = roleData?.role || "unknown";
  let context = `USER: ${profile.full_name} | Role: ${role} | County: ${profile.county || "N/A"}`;

  if (role === "waste_picker") {
    // Recent collections
    const { data: collections } = await supabase
      .from("collections")
      .select("quantity, collected_at, material_type_id, material_types(name, price_per_unit)")
      .eq("user_id", profile.user_id)
      .order("collected_at", { ascending: false })
      .limit(10);

    if (collections?.length) {
      const totalKg = collections.reduce((s: number, c: any) => s + (c.quantity || 0), 0);
      const materials = collections.map((c: any) =>
        `${c.material_types?.name || "Unknown"}: ${c.quantity}kg @ KES ${c.material_types?.price_per_unit}/kg`
      ).join(", ");
      context += `\nRecent collections (${collections.length}): ${materials}\nTotal recent: ${totalKg}kg`;
    }

    // Client collections
    const { data: clientCols } = await supabase
      .from("client_collections")
      .select("material_type, quantity_kg, total_amount, collection_date")
      .eq("waste_picker_id", profile.user_id)
      .order("collection_date", { ascending: false })
      .limit(5);

    if (clientCols?.length) {
      const totalEarnings = clientCols.reduce((s: number, c: any) => s + (c.total_amount || 0), 0);
      context += `\nClient collections: ${clientCols.length} recent, earnings KES ${totalEarnings}`;
    }
  }

  if (role === "aggregator") {
    // Inventory from purchase orders
    const { data: orders } = await supabase
      .from("aggregator_purchase_orders")
      .select("material_type, quantity, total_amount, status")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (orders?.length) {
      const inventory = orders.filter((o: any) => o.status === "delivered");
      const totalKg = inventory.reduce((s: number, o: any) => s + (o.quantity || 0), 0);
      context += `\nInventory: ${totalKg}kg across ${inventory.length} delivered orders`;
    }
  }

  if (role === "recycler") {
    // Products and orders
    const { data: products } = await supabase
      .from("recycler_products")
      .select("name, stock_quantity, price_per_unit, unit")
      .eq("user_id", profile.user_id)
      .limit(10);

    if (products?.length) {
      const productList = products.map((p: any) => `${p.name}: ${p.stock_quantity} ${p.unit}`).join(", ");
      context += `\nProducts: ${productList}`;
    }
  }

  // Financial summary
  const { data: transactions } = await supabase
    .from("financial_transactions")
    .select("type, amount")
    .eq("user_id", profile.user_id)
    .gte("transaction_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));

  if (transactions?.length) {
    const income = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
    const expense = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
    context += `\n30-day finances: Income KES ${income}, Expenses KES ${expense}, Net KES ${income - expense}`;
  }

  // Material prices
  const { data: materials } = await supabase
    .from("material_types")
    .select("name, price_per_unit, unit")
    .limit(10);

  if (materials?.length) {
    const prices = materials.map((m: any) => `${m.name}: KES ${m.price_per_unit}/${m.unit}`).join(", ");
    context += `\nCurrent prices: ${prices}`;
  }

  return context;
}

async function callAI(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const response = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI error:", response.status, errText);
    throw new Error(`AI error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't process that. Please try again.";
}

async function sendWhatsApp(to: string, body: string, lovableKey: string, twilioKey: string) {
  const response = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: "whatsapp:+14155238886", // Twilio sandbox number — replace with your own
      Body: body,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Twilio send error:", response.status, JSON.stringify(data));
    throw new Error(`Twilio error ${response.status}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY not configured");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Twilio sends webhooks as application/x-www-form-urlencoded
    const contentType = req.headers.get("content-type") || "";

    let from = "";
    let messageBody = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      from = formData.get("From")?.toString() || "";
      messageBody = formData.get("Body")?.toString().trim() || "";
    } else {
      // JSON fallback for testing
      const json = await req.json();
      from = json.From || json.from || "";
      messageBody = (json.Body || json.body || "").trim();
    }

    if (!from || !messageBody) {
      return new Response("<Response></Response>", {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    console.log(`Message from ${from}: ${messageBody}`);

    // Create supabase client with service role for data access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user context from DB
    const userContext = await fetchUserContext(supabase, from);

    // Build conversation
    addMessage(from, "user", messageBody);
    const history = getConversation(from);

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `CURRENT USER DATA:\n${userContext}` },
      ...history,
    ];

    // Call AI
    const aiResponse = await callAI(aiMessages, LOVABLE_API_KEY);
    addMessage(from, "assistant", aiResponse);

    // Send response via WhatsApp
    await sendWhatsApp(from, aiResponse, LOVABLE_API_KEY, TWILIO_API_KEY);

    // Return TwiML empty response (Twilio expects this)
    return new Response("<Response></Response>", {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("<Response></Response>", {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
      status: 200, // Always 200 for Twilio webhooks
    });
  }
});
