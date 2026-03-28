const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 3000);
  } catch (e) {
    clearTimeout(timer);
    console.log(`Timeout/error fetching ${url}: ${e}`);
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userRole, impactArea } = await req.json();

    const sources = [
      { url: "https://www.opportunitiesforafricans.com/", name: "OpportunitiesForAfricans" },
      { url: "https://opportunitydesk.org/", name: "OpportunityDesk" },
      { url: "https://opportunitiesforyouth.org/", name: "OpportunitiesForYouth" },
      { url: "https://www.youthop.com/", name: "YouthOp" },
    ];

    console.log("Fetching sources...");
    const results = await Promise.allSettled(
      sources.map(s => fetchWithTimeout(s.url))
    );

    const combinedContent = sources
      .map((s, i) => {
        const result = results[i];
        const text = result.status === "fulfilled" ? result.value : "";
        return text ? `--- ${s.name} ---\n${text}` : "";
      })
      .filter(Boolean)
      .join("\n\n");

    console.log(`Fetched content length: ${combinedContent.length}`);

    if (!combinedContent.trim()) {
      console.log("No content fetched from any source");
      return new Response(
        JSON.stringify({ grants: [], error: "Could not reach opportunity sources" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ grants: [], error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roleLabel =
      userRole === "waste_picker" ? "waste picker / informal recycler"
        : userRole === "aggregator" ? "waste aggregator / collection center"
        : "recycler / plastic processor";

    const systemPrompt = `Extract grants, fellowships, funding and programs from scraped website text. Focus on opportunities relevant to:
- Waste management, recycling, circular economy, environment
- Youth empowerment, community development in Africa
- Small business grants, social enterprise funding
- Climate action, plastic pollution
- Role: ${roleLabel}
${impactArea ? `- Impact area: ${impactArea}` : ""}

Return a JSON array of up to 10 relevant opportunities:
[{"title":"string","organization":"string","deadline":"string or Rolling","description":"2 sentences","url":"string or empty","relevance":"why relevant","funding_amount":"string or Varies"}]
Return ONLY the JSON array.`;

    console.log("Calling AI gateway...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract relevant grants:\n\n${combinedContent.slice(0, 8000)}` },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ grants: [], error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let grants;
    try {
      grants = JSON.parse(content);
    } catch {
      console.error("Failed to parse:", content.slice(0, 200));
      grants = [];
    }

    console.log(`Returning ${grants.length} grants`);
    return new Response(JSON.stringify({ grants }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ grants: [], error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
