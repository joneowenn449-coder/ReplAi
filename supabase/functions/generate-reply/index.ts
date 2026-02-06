import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get review
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", review_id)
      .maybeSingle();

    if (fetchError) throw new Error(`DB error: ${fetchError.message}`);
    if (!review) throw new Error("Review not found");

    // Get settings for prompt template
    const { data: settings } = await supabase
      .from("settings")
      .select("ai_prompt_template")
      .limit(1)
      .maybeSingle();

    const promptTemplate =
      settings?.ai_prompt_template ||
      "Ты — менеджер бренда на Wildberries. Напиши вежливый ответ на отзыв покупателя. 2-4 предложения.";

    // Build attachment info
    const photoLinks = Array.isArray(review.photo_links) ? review.photo_links : [];
    const photoCount = photoLinks.length;
    const hasVideo = review.has_video === true;
    let attachmentInfo = "";
    if (photoCount > 0 || hasVideo) {
      const parts: string[] = [];
      if (photoCount > 0) {
        const photoWord = photoCount === 1 ? "фотографию" : photoCount < 5 ? "фотографии" : "фотографий";
        parts.push(`${photoCount} ${photoWord}`);
      }
      if (hasVideo) parts.push("видео");
      attachmentInfo = `\n\n[Покупатель приложил ${parts.join(" и ")} к отзыву.]`;
    }

    const userMessage = `Отзыв (${review.rating} из 5 звёзд) на товар "${review.product_name}":\n\n${review.text || "(Без текста, только оценка)"}${attachmentInfo}`;

    // Call OpenRouter
    const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: promptTemplate },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      throw new Error(`OpenRouter error ${aiResp.status}: ${text}`);
    }

    const aiData = await aiResp.json();
    const newDraft = aiData.choices?.[0]?.message?.content || "";

    if (!newDraft) throw new Error("AI returned empty response");

    // Update review with new draft
    const { error: updateError } = await supabase
      .from("reviews")
      .update({ ai_draft: newDraft, status: "pending" })
      .eq("id", review_id);

    if (updateError) throw new Error(`DB update error: ${updateError.message}`);

    return new Response(
      JSON.stringify({ success: true, draft: newDraft }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
