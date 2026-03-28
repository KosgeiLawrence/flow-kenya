const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DuaraFlowBot/1.0; +https://flow-kenya-trace.lovable.app)",
      },
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags, keep text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Limit to ~4000 chars to stay within token limits
    return text.slice(0, 4000);
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e);
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
      "https://www.opportunitiesforafricans.com/",
      "https://opportunitydesk.org/",
      "https://opportunitiesforyouth.org/",
      "https://www.youthop.com/",
    ];

    // Fetch all pages in parallel
    const pageTexts = await Promise.all(sources.map(fetchPageText));

    const combinedContent = sources
      .map((url, i) => `--- Source: ${url} ---\n${pageTexts[i]}`)
      .filter((_, i) => pageTexts[i].length > 0)
      .join("\n\n");

    if (!combinedContent.trim()) {
      return new Response(
        JSON.stringify({ grants: [], error: "Could not fetch any sources" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ grants: [], error: "AI not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const roleLabel =
      userRole === "waste_picker"
        ? "waste picker / informal recycler"
        : userRole === "aggregator"
        ? "waste aggregator / collection center"
        : "recycler / plastic processor";

    const systemPrompt = `You are an AI that extracts grants, fellowships, funding opportunities, and programs from scraped website content. Focus ONLY on opportunities relevant to:
- Waste management, recycling, circular economy, environmental sustainability
- Youth empowerment, community development in Africa
- Small business grants, social enterprise funding
- Climate action, plastic pollution, clean energy
- Role: ${roleLabel}
${impactArea ? `- Impact area: ${impactArea}` : ""}

Return EXACTLY a JSON array of the top 10 most relevant opportunities. Each object must have:
{
  "title": "string - opportunity name",
  "organization": "string - funding org",
  "deadline": "string - deadline date or 'Rolling' or 'Unknown'",
  "description": "string - 2 sentence summary",
  "url": "string - link to apply or learn more",
  "relevance": "string - why it's relevant to this user",
  "funding_amount": "string - amount if mentioned or 'Varies'"
}

If fewer than 10 relevant opportunities exist, return what you find. Return ONLY the JSON array, no markdown.`;

    const aiRes = await fetch("https://ai.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract the top 10 relevant grants and programs from these pages:\n\n${combinedContent}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", errText);
      return new Response(
        JSON.stringify({ grants: [], error: "AI processing failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";

    // Clean markdown code fences if present
    content = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let grants;
    try {
      grants = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      grants = [];
    }

    return new Response(JSON.stringify({ grants }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        grants: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
