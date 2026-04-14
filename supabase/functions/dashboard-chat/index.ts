import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://api.lovable.dev/api/ai/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, role, navItems, userId } = await req.json();

    if (!messages || !Array.isArray(messages) || !role) {
      return new Response(JSON.stringify({ error: "messages and role required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user data context from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let dataContext = "";

    if (userId) {
      // Fetch relevant data based on role
      const contextParts: string[] = [];

      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number, county, area_of_operation, approval_status, organization_id")
        .eq("user_id", userId)
        .single();
      if (profile) contextParts.push(`User profile: ${JSON.stringify(profile)}`);

      // Collections
      if (["waste_picker", "aggregator", "admin"].includes(role)) {
        const { data: collections } = await supabase
          .from("collections")
          .select("quantity, material_type_id, collected_at, location_name")
          .eq("user_id", userId)
          .order("collected_at", { ascending: false })
          .limit(50);
        if (collections?.length) contextParts.push(`Recent collections (${collections.length}): ${JSON.stringify(collections)}`);

        const { data: clientCols } = await supabase
          .from("client_collections")
          .select("client_name, material_type, quantity_kg, total_amount, collection_date")
          .eq("waste_picker_id", userId)
          .order("collection_date", { ascending: false })
          .limit(30);
        if (clientCols?.length) contextParts.push(`Client collections (${clientCols.length}): ${JSON.stringify(clientCols)}`);
      }

      // Financial transactions
      const { data: transactions } = await supabase
        .from("financial_transactions")
        .select("amount, type, description, transaction_date, payment_method")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .limit(50);
      if (transactions?.length) contextParts.push(`Financial transactions (${transactions.length}): ${JSON.stringify(transactions)}`);

      // Customers
      const { data: customers } = await supabase
        .from("customers")
        .select("full_name, category, total_revenue, total_transactions")
        .eq("user_id", userId)
        .limit(30);
      if (customers?.length) contextParts.push(`Customers (${customers.length}): ${JSON.stringify(customers)}`);

      // Pickup requests
      if (["waste_picker", "aggregator"].includes(role)) {
        const { data: pickups } = await supabase
          .from("pickup_requests")
          .select("material_type, quantity_kg, status, scheduled_date, total_amount")
          .or(`waste_picker_id.eq.${userId},target_user_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(20);
        if (pickups?.length) contextParts.push(`Pickup requests (${pickups.length}): ${JSON.stringify(pickups)}`);
      }

      // Material types
      const { data: materials } = await supabase
        .from("material_types")
        .select("name, price_per_unit, unit");
      if (materials?.length) contextParts.push(`Material prices: ${JSON.stringify(materials)}`);

      // Recycler specific
      if (role === "recycler") {
        const { data: orders } = await supabase
          .from("recycler_orders")
          .select("material_type, quantity, unit_price, total_amount, status")
          .eq("user_id", userId)
          .limit(30);
        if (orders?.length) contextParts.push(`Orders (${orders.length}): ${JSON.stringify(orders)}`);

        const { data: products } = await supabase
          .from("recycler_products")
          .select("name, price_per_unit, stock_quantity, status")
          .eq("user_id", userId);
        if (products?.length) contextParts.push(`Products: ${JSON.stringify(products)}`);
      }

      // Aggregator specific
      if (role === "aggregator") {
        const { data: pos } = await supabase
          .from("aggregator_purchase_orders")
          .select("po_number, supplier_name, material_type, quantity, total_amount, status")
          .eq("user_id", userId)
          .limit(30);
        if (pos?.length) contextParts.push(`Purchase orders (${pos.length}): ${JSON.stringify(pos)}`);
      }

      // Cleanup exercises
      const { data: cleanups } = await supabase
        .from("cleanup_exercises")
        .select("title, cleanup_date, total_waste_kg, num_volunteers, status")
        .eq("user_id", userId)
        .limit(10);
      if (cleanups?.length) contextParts.push(`Cleanup exercises (${cleanups.length}): ${JSON.stringify(cleanups)}`);

      dataContext = contextParts.join("\n\n");
    }

    const navItemsStr = navItems
      ? navItems.map((n: { id: string; label: string }) => `- "${n.label}" → navigate to panel id "${n.id}"`).join("\n")
      : "";

    const systemPrompt = `You are Duara Flow AI Assistant, embedded in the ${role.replace(/_/g, " ")} dashboard of a waste management and recycling platform in Kenya.

ROLE CONTEXT: You're helping a ${role.replace(/_/g, " ")} user navigate their dashboard, understand their data, and perform actions.

NAVIGATION: The user's dashboard has these sections:
${navItemsStr}

When the user wants to navigate somewhere or perform an action that maps to a panel, respond with the navigation command in this exact format at the END of your message:
[[NAVIGATE:panel_id]]

For example, if user says "show me my earnings" → respond with helpful text then [[NAVIGATE:my-earnings]]
If user says "add an expense" → guide them and [[NAVIGATE:my-earnings]]
If user says "go to settings" → [[NAVIGATE:settings]]
If user says "show my collections" → [[NAVIGATE:collection]]

DASHBOARD DATA (use this for analysis when asked):
${dataContext || "No data loaded yet."}

GUIDELINES:
- Be concise, helpful, and professional
- When analyzing data, provide specific numbers and insights
- Use markdown for formatting (bold, lists, tables)
- If asked about data you don't have, say so honestly
- Currency is KES (Kenyan Shillings)
- Weight is in kg or tons
- Always respond in the language the user writes in
- Be proactive with suggestions based on the data
- If the user asks something that maps to a dashboard section, ALWAYS include the [[NAVIGATE:id]] command`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
