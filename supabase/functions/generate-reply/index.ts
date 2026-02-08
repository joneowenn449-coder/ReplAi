import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REFUSAL_KEYWORDS = [
  "отказ", "вернул", "вернула", "возврат",
  "не выкупил", "не выкупила", "не забрал", "не забрала",
  "отдал предпочтение", "отдала предпочтение",
  "не подошёл", "не подошла", "не подошло", "не подошел",
  "отправил обратно", "отправила обратно",
  "выбрал другой", "выбрала другую", "выбрала другой",
];

function detectRefusal(text?: string | null, pros?: string | null, cons?: string | null): boolean {
  const combined = [text, pros, cons].filter(Boolean).join(" ").toLowerCase();
  return REFUSAL_KEYWORDS.some((kw) => combined.includes(kw));
}

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extract user_id from auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;

    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    // Get review scoped to this user
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", review_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw new Error(`DB error: ${fetchError.message}`);
    if (!review) throw new Error("Review not found");

    // Get settings for this user's prompt template and brand
    const { data: settings } = await supabase
      .from("settings")
      .select("ai_prompt_template, brand_name")
      .eq("user_id", userId)
      .maybeSingle();

    // Fetch recommendations scoped to this user
    const { data: recommendations } = await supabase
      .from("product_recommendations")
      .select("target_article, target_name")
      .eq("source_article", review.product_article)
      .eq("user_id", userId);

    let recommendationInstruction = "";
    if (recommendations && recommendations.length > 0) {
      const recList = recommendations
        .map((r) => `- Артикул ${r.target_article}${r.target_name ? `: "${r.target_name}"` : ""}`)
        .join("\n");
      recommendationInstruction = `\n\nРЕКОМЕНДАЦИИ: В конце ответа ненавязчиво предложи покупателю обратить внимание на другие наши товары:\n${recList}\nУпомяни артикулы, чтобы покупатель мог их найти на WB.`;
      console.log(`[generate-reply] Adding ${recommendations.length} recommendations to prompt`);
    }

    const promptTemplate =
      settings?.ai_prompt_template ||
      "Ты — менеджер бренда на Wildberries. Напиши вежливый ответ на отзыв покупателя. 2-4 предложения.";

    // Check if review is empty
    const isEmptyReview = !review.text && !review.pros && !review.cons;
    const isHighRating = review.rating >= 4;

    // For empty reviews with 4-5 stars, use a short gratitude prompt
    if (isEmptyReview && isHighRating) {
      const authorName = review.author_name || "";
      const nameInstruction = authorName && authorName !== "Покупатель"
        ? ` Обратись к покупателю по имени: ${authorName}.`
        : "";

      const shortPrompt = `Покупатель оставил оценку ${review.rating} из 5 без текста. Напиши краткую благодарность за высокую оценку. Максимум 1-2 предложения. Без лишних деталей.${nameInstruction}`;

      const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: shortPrompt }],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!aiResp.ok) {
        const text = await aiResp.text();
        throw new Error(`OpenRouter error ${aiResp.status}: ${text}`);
      }

      const aiData = await aiResp.json();
      const newDraft = aiData.choices?.[0]?.message?.content || "";

      if (!newDraft) throw new Error("AI returned empty response");

      const { error: updateError } = await supabase
        .from("reviews")
        .update({ ai_draft: newDraft, status: "pending" })
        .eq("id", review_id)
        .eq("user_id", userId);

      if (updateError) throw new Error(`DB update error: ${updateError.message}`);

      return new Response(
        JSON.stringify({ success: true, draft: newDraft }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Build full review content
    let reviewContent = "";
    const contentParts: string[] = [];
    if (review.text) contentParts.push(`Комментарий: ${review.text}`);
    if (review.pros) contentParts.push(`Плюсы: ${review.pros}`);
    if (review.cons) contentParts.push(`Недостатки: ${review.cons}`);
    reviewContent = contentParts.length > 0 ? contentParts.join("\n\n") : "(Без текста, только оценка)";

    const authorName = review.author_name || "";
    const nameInstruction = authorName && authorName !== "Покупатель"
      ? `\n\nИмя покупателя: ${authorName}. Обратись к покупателю по имени в ответе.`
      : "";

    const isRefusal = detectRefusal(review.text, review.pros, review.cons);
    const refusalWarning = isRefusal
      ? `\n\n[ВНИМАНИЕ: Покупатель НЕ выкупил товар (обнаружены признаки отказа/возврата). НЕ благодари за покупку или выбор товара. Поблагодари за внимание к бренду, вырази сожаление, что модель не подошла, и пригласи вернуться.]`
      : "";

    if (isRefusal) {
      console.log(`[generate-reply] Refusal detected for review ${review_id}`);
    }

    // Determine brand name: review-level > settings-level
    const brandName = review.brand_name || settings?.brand_name || "";
    const brandInstruction = brandName
      ? `\n\nНазвание бренда продавца: ${brandName}. Используй это название при обращении к покупателю.`
      : "";

    const userMessage = `ВАЖНО: строго следуй всем правилам из системного промпта. Не игнорируй ни одно требование.${refusalWarning}${brandInstruction}\n\nОтзыв (${review.rating} из 5 звёзд) на товар "${review.product_name}":\n\n${reviewContent}${attachmentInfo}${nameInstruction}${recommendationInstruction}`;

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
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      throw new Error(`OpenRouter error ${aiResp.status}: ${text}`);
    }

    const aiData = await aiResp.json();
    const newDraft = aiData.choices?.[0]?.message?.content || "";

    if (!newDraft) throw new Error("AI returned empty response");

    // Update review with new draft (scoped to user)
    const { error: updateError } = await supabase
      .from("reviews")
      .update({ ai_draft: newDraft, status: "pending" })
      .eq("id", review_id)
      .eq("user_id", userId);

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
