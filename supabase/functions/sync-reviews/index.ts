import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WB_BASE_URL = "https://feedbacks-api.wildberries.ru";

async function fetchWBReviews(apiKey: string, skip = 0, take = 50) {
  const url = `${WB_BASE_URL}/api/v1/feedbacks?isAnswered=false&take=${take}&skip=${skip}`;
  const resp = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`WB API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function sendWBAnswer(apiKey: string, feedbackId: string, text: string) {
  const resp = await fetch(`${WB_BASE_URL}/api/v1/feedbacks`, {
    method: "PATCH",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: feedbackId, text }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`WB answer error ${resp.status}: ${body}`);
  }
  return resp;
}

async function generateAIReply(
  apiKey: string,
  systemPrompt: string,
  reviewText: string,
  rating: number,
  productName: string
) {
  const userMessage = `Отзыв (${rating} из 5 звёзд) на товар "${productName}":\n\n${reviewText || "(Без текста, только оценка)"}`;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 500,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WB_API_KEY = Deno.env.get("WB_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!WB_API_KEY) throw new Error("WB_API_KEY is not configured");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get settings
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const autoReply = settings?.auto_reply_enabled ?? false;
    const promptTemplate =
      settings?.ai_prompt_template ||
      "Ты — менеджер бренда на Wildberries. Напиши вежливый ответ на отзыв покупателя. 2-4 предложения.";

    // Fetch unanswered reviews from WB
    const wbData = await fetchWBReviews(WB_API_KEY);
    const feedbacks = wbData?.data?.feedbacks || [];

    console.log(`Fetched ${feedbacks.length} unanswered reviews from WB`);

    let newCount = 0;
    let autoSentCount = 0;
    const errors: string[] = [];

    for (const fb of feedbacks) {
      const wbId = fb.id;

      // Check if already exists
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("wb_id", wbId)
        .maybeSingle();

      if (existing) continue;

      // Generate AI draft
      let aiDraft = "";
      try {
        aiDraft = await generateAIReply(
          OPENROUTER_API_KEY,
          promptTemplate,
          fb.text || "",
          fb.productValuation || 5,
          fb.productDetails?.productName || fb.subjectName || "Товар"
        );
      } catch (e) {
        console.error(`AI generation failed for ${wbId}:`, e);
        errors.push(`AI error for ${wbId}: ${e.message}`);
      }

      let status = "pending";

      // Auto-reply if enabled and draft generated
      if (autoReply && aiDraft) {
        try {
          await sendWBAnswer(WB_API_KEY, wbId, aiDraft);
          status = "auto";
          autoSentCount++;
          // Rate limit: max 3 req/sec
          await delay(350);
        } catch (e) {
          console.error(`Auto-reply failed for ${wbId}:`, e);
          errors.push(`Send error for ${wbId}: ${e.message}`);
          status = "pending";
        }
      }

      // Save to DB
      const { error: insertError } = await supabase.from("reviews").insert({
        wb_id: wbId,
        rating: fb.productValuation || 5,
        author_name: fb.userName || "Покупатель",
        text: fb.text || null,
        product_name:
          fb.productDetails?.productName || fb.subjectName || "Товар",
        product_article:
          String(fb.productDetails?.nmId || fb.nmId || ""),
        photo_links: fb.photoLinks || [],
        created_date: fb.createdDate || new Date().toISOString(),
        status,
        ai_draft: aiDraft || null,
        sent_answer: status === "auto" ? aiDraft : null,
      });

      if (insertError) {
        console.error(`Insert error for ${wbId}:`, insertError);
        errors.push(`DB error for ${wbId}: ${insertError.message}`);
      } else {
        newCount++;
      }
    }

    // Update last_sync_at
    if (settings?.id) {
      await supabase
        .from("settings")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", settings.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: feedbacks.length,
        new: newCount,
        autoSent: autoSentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("sync-reviews error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
