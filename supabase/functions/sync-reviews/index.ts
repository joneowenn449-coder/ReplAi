import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WB_BASE_URL = "https://feedbacks-api.wildberries.ru";

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

async function fetchWBReviews(apiKey: string, skip = 0, take = 50) {
  const url = `${WB_BASE_URL}/api/v1/feedbacks?isAnswered=false&take=${take}&skip=${skip}`;
  const resp = await fetch(url, { headers: { Authorization: apiKey } });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`WB API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function sendWBAnswer(apiKey: string, feedbackId: string, text: string) {
  const resp = await fetch(`${WB_BASE_URL}/api/v1/feedbacks/answer`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ id: feedbackId, text }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`WB answer error ${resp.status}: ${body}`);
  }
  return resp;
}

async function generateAIReply(
  apiKey: string, systemPrompt: string, reviewText: string, rating: number,
  productName: string, photoCount = 0, hasVideo = false, authorName = "",
  isEmpty = false, recommendationInstruction = "", isRefusal = false, brandName = ""
) {
  let emptyInstruction = "";
  if (isEmpty) {
    emptyInstruction = rating >= 4
      ? `\n\n[Это пустой отзыв. Оценка ${rating}/5. КОРОТКАЯ благодарность, 1-2 предложения.]`
      : `\n\n[Это пустой отзыв. Оценка ${rating}/5. Сожаление + предложи написать в чат. 1-2 предложения.]`;
  }

  let attachmentInfo = "";
  if (photoCount > 0 || hasVideo) {
    const parts: string[] = [];
    if (photoCount > 0) parts.push(`${photoCount} фото`);
    if (hasVideo) parts.push("видео");
    attachmentInfo = `\n\n[Покупатель приложил ${parts.join(" и ")}.]`;
  }

  const nameInstruction = authorName && authorName !== "Покупатель"
    ? `\n\nИмя покупателя: ${authorName}. Обратись по имени.` : "";

  const refusalWarning = isRefusal
    ? `\n\n[ВНИМАНИЕ: Покупатель НЕ выкупил товар. НЕ благодари за покупку.]` : "";

  const brandInstruction = brandName
    ? `\n\nБренд: ${brandName}. Используй в ответе.` : "";

  const userMessage = `ВАЖНО: следуй правилам промпта.${refusalWarning}${brandInstruction}\n\nОтзыв (${rating}/5) на "${productName}":\n\n${reviewText || "(Без текста)"}${attachmentInfo}${nameInstruction}${recommendationInstruction}${emptyInstruction}`;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: isEmpty ? 300 : 1000,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

function buildReviewText(text?: string, pros?: string, cons?: string): string {
  const parts: string[] = [];
  if (text) parts.push(`Комментарий: ${text}`);
  if (pros) parts.push(`Плюсы: ${pros}`);
  if (cons) parts.push(`Недостатки: ${cons}`);
  return parts.length > 0 ? parts.join("\n\n") : "";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CabinetSettings {
  id: string;
  user_id: string;
  wb_api_key: string;
  ai_prompt_template: string;
  reply_modes: Record<string, string>;
  brand_name: string;
}

async function processCabinetReviews(
  supabase: any,
  cabinet: CabinetSettings,
  OPENROUTER_API_KEY: string
) {
  const userId = cabinet.user_id;
  const cabinetId = cabinet.id;
  const WB_API_KEY = cabinet.wb_api_key;
  const defaultModes = { "1": "manual", "2": "manual", "3": "manual", "4": "manual", "5": "manual" };
  const replyModes = cabinet.reply_modes || defaultModes;

  const { data: tokenBalance } = await supabase
    .from("token_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  let currentBalance = tokenBalance?.balance ?? 0;
  const promptTemplate = cabinet.ai_prompt_template ||
    "Ты — менеджер бренда на Wildberries. Напиши вежливый ответ на отзыв покупателя. 2-4 предложения.";

  const allFeedbacks: any[] = [];
  let skip = 0;
  const take = 50;
  while (true) {
    const wbData = await fetchWBReviews(WB_API_KEY, skip, take);
    const feedbacks = wbData?.data?.feedbacks || [];
    if (feedbacks.length === 0) break;
    allFeedbacks.push(...feedbacks);
    if (feedbacks.length < take) break;
    skip += take;
    await delay(350);
  }

  console.log(`[sync-reviews] cabinet=${cabinetId} user=${userId} Fetched ${allFeedbacks.length} reviews`);

  let newCount = 0;
  let autoSentCount = 0;
  const errors: string[] = [];

  for (const fb of allFeedbacks) {
    const wbId = fb.id;

    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("wb_id", wbId)
      .eq("user_id", userId)
      .eq("cabinet_id", cabinetId)
      .maybeSingle();

    if (existing) continue;

    const photoLinks = fb.photoLinks || [];
    const hasVideo = !!(fb.video && (fb.video.link || fb.video.previewImage));
    const isEmptyReview = !fb.text && !fb.pros && !fb.cons;

    const productArticle = String(fb.productDetails?.nmId || fb.nmId || "");
    let recommendationInstruction = "";
    if (productArticle) {
      const { data: recommendations } = await supabase
        .from("product_recommendations")
        .select("target_article, target_name")
        .eq("source_article", productArticle)
        .eq("user_id", userId);

      if (recommendations && recommendations.length > 0) {
        const recList = recommendations
          .map((r: any) => `- Артикул ${r.target_article}${r.target_name ? `: "${r.target_name}"` : ""}`)
          .join("\n");
        recommendationInstruction = `\n\nРЕКОМЕНДАЦИИ: предложи товары:\n${recList}`;
      }
    }

    const reviewBrandName = fb.productDetails?.brandName || "";
    const effectiveBrand = reviewBrandName || cabinet.brand_name || "";
    const isRefusal = detectRefusal(fb.text, fb.pros, fb.cons);

    let aiDraft = "";
    try {
      aiDraft = await generateAIReply(
        OPENROUTER_API_KEY, promptTemplate,
        buildReviewText(fb.text, fb.pros, fb.cons),
        fb.productValuation || 5,
        fb.productDetails?.productName || fb.subjectName || "Товар",
        photoLinks.length, hasVideo, fb.userName || "",
        isEmptyReview, recommendationInstruction, isRefusal, effectiveBrand
      );
    } catch (e) {
      console.error(`AI generation failed for ${wbId}:`, e);
      errors.push(`AI error for ${wbId}: ${e.message}`);
    }

    let status = "pending";
    const rating = fb.productValuation || 5;
    const ratingKey = String(rating);
    const modeForRating = replyModes[ratingKey] || "manual";

    if (modeForRating === "auto" && aiDraft) {
      if (currentBalance < 1) {
        status = "pending";
      } else {
        try {
          await sendWBAnswer(WB_API_KEY, wbId, aiDraft);
          status = "auto";
          autoSentCount++;
          currentBalance -= 1;
          await supabase.from("token_balances").update({ balance: currentBalance }).eq("user_id", userId);
          await delay(350);
        } catch (e) {
          console.error(`Auto-reply failed for ${wbId}:`, e);
          errors.push(`Send error for ${wbId}: ${e.message}`);
          status = "pending";
        }
      }
    }

    const { data: insertedReview, error: insertError } = await supabase.from("reviews").insert({
      wb_id: wbId,
      user_id: userId,
      cabinet_id: cabinetId,
      rating: fb.productValuation || 5,
      author_name: fb.userName || "Покупатель",
      text: fb.text || null,
      pros: fb.pros || null,
      cons: fb.cons || null,
      product_name: fb.productDetails?.productName || fb.subjectName || "Товар",
      product_article: String(fb.productDetails?.nmId || fb.nmId || ""),
      brand_name: reviewBrandName,
      photo_links: photoLinks,
      has_video: hasVideo,
      created_date: fb.createdDate || new Date().toISOString(),
      status,
      ai_draft: aiDraft || null,
      sent_answer: status === "auto" ? aiDraft : null,
    }).select("id").single();

    if (insertError) {
      console.error(`Insert error for ${wbId}:`, insertError);
      errors.push(`DB error for ${wbId}: ${insertError.message}`);
    } else {
      newCount++;
      if (status === "auto" && insertedReview) {
        await supabase.from("token_transactions").insert({
          user_id: userId, amount: -1, type: "usage",
          description: "Автоответ на отзыв", review_id: insertedReview.id,
        });
      }
    }
  }

  // Retry pending reviews
  const { data: pendingReviews } = await supabase
    .from("reviews")
    .select("id, wb_id, rating, ai_draft")
    .eq("status", "pending")
    .eq("user_id", userId)
    .eq("cabinet_id", cabinetId)
    .not("ai_draft", "is", null);

  if (pendingReviews && pendingReviews.length > 0) {
    for (const pr of pendingReviews) {
      const ratingKey = String(pr.rating);
      const modeForRating = replyModes[ratingKey] || "manual";
      if (modeForRating === "auto" && pr.ai_draft) {
        if (currentBalance < 1) continue;
        try {
          await sendWBAnswer(WB_API_KEY, pr.wb_id, pr.ai_draft);
          await supabase.from("reviews")
            .update({ status: "auto", sent_answer: pr.ai_draft, updated_at: new Date().toISOString() })
            .eq("id", pr.id);
          autoSentCount++;
          currentBalance -= 1;
          await supabase.from("token_balances").update({ balance: currentBalance }).eq("user_id", userId);
          await supabase.from("token_transactions").insert({
            user_id: userId, amount: -1, type: "usage",
            description: "Автоответ на отзыв", review_id: pr.id,
          });
          await delay(350);
        } catch (e) {
          errors.push(`Auto-retry error for ${pr.wb_id}: ${e.message}`);
        }
      }
    }
  }

  // Update last_sync_at on cabinet
  await supabase
    .from("wb_cabinets")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", cabinetId);

  // Also update settings for backwards compat
  await supabase
    .from("settings")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId);

  return {
    cabinetId,
    userId,
    fetched: allFeedbacks.length,
    new: newCount,
    autoSent: autoSentCount,
    errors: errors.length > 0 ? errors : undefined,
  };
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

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (userId) {
      // Single user mode — process active cabinet
      const { data: activeCabinet } = await supabase
        .from("wb_cabinets")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!activeCabinet?.wb_api_key) {
        throw new Error("WB API ключ не настроен. Добавьте его в настройках.");
      }

      const result = await processCabinetReviews(supabase, activeCabinet as CabinetSettings, OPENROUTER_API_KEY);

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Cron mode — process ALL cabinets with API keys
      console.log("[sync-reviews] Cron mode — processing all cabinets");
      const { data: allCabinets } = await supabase
        .from("wb_cabinets")
        .select("*")
        .not("wb_api_key", "is", null);

      if (!allCabinets || allCabinets.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No cabinets to process" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const cabinet of allCabinets) {
        try {
          console.log(`[sync-reviews] Processing cabinet ${cabinet.id} user ${cabinet.user_id}`);
          const result = await processCabinetReviews(supabase, cabinet as CabinetSettings, OPENROUTER_API_KEY);
          results.push(result);
        } catch (e) {
          console.error(`[sync-reviews] Error for cabinet ${cabinet.id}:`, e);
          results.push({ cabinetId: cabinet.id, userId: cabinet.user_id, error: e.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("sync-reviews error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
