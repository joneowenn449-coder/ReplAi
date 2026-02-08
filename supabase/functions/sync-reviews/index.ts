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
  const resp = await fetch(`${WB_BASE_URL}/api/v1/feedbacks/answer`, {
    method: "POST",
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
  productName: string,
  photoCount: number = 0,
  hasVideo: boolean = false,
  authorName: string = "",
  isEmpty: boolean = false,
  recommendationInstruction: string = ""
) {
  if (isEmpty && rating >= 4) {
    const nameInstruction = authorName && authorName !== "Покупатель"
      ? ` Обратись к покупателю по имени: ${authorName}.`
      : "";

    const shortPrompt = `Покупатель оставил оценку ${rating} из 5 без текста. Напиши краткую благодарность за высокую оценку. Максимум 1-2 предложения. Без лишних деталей.${nameInstruction}`;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: shortPrompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`OpenRouter error ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || "";
  }

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

  const nameInstruction = authorName && authorName !== "Покупатель"
    ? `\n\nИмя покупателя: ${authorName}. Обратись к покупателю по имени в ответе.`
    : "";

  const userMessage = `ВАЖНО: строго следуй всем правилам из системного промпта. Не игнорируй ни одно требование.\n\nОтзыв (${rating} из 5 звёзд) на товар "${productName}":\n\n${reviewText || "(Без текста, только оценка)"}${attachmentInfo}${nameInstruction}${recommendationInstruction}`;

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
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${text}`);
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

interface UserSettings {
  id: string;
  user_id: string;
  wb_api_key: string;
  ai_prompt_template: string;
  reply_modes: Record<string, string>;
  auto_reply_enabled: boolean;
}

async function processUserReviews(
  supabase: any,
  userSettings: UserSettings,
  OPENROUTER_API_KEY: string
) {
  const userId = userSettings.user_id;
  const WB_API_KEY = userSettings.wb_api_key;
  const defaultModes = { "1": "manual", "2": "manual", "3": "manual", "4": "manual", "5": "manual" };
  const replyModes = userSettings.reply_modes || defaultModes;
  const promptTemplate = userSettings.ai_prompt_template ||
    "Ты — менеджер бренда на Wildberries. Напиши вежливый ответ на отзыв покупателя. 2-4 предложения.";

  // Fetch ALL unanswered reviews from WB with pagination
  const allFeedbacks: any[] = [];
  let skip = 0;
  const take = 50;
  while (true) {
    const wbData = await fetchWBReviews(WB_API_KEY, skip, take);
    const feedbacks = wbData?.data?.feedbacks || [];
    console.log(`[sync-reviews] user=${userId} WB page skip=${skip}: got ${feedbacks.length} reviews`);
    if (feedbacks.length === 0) break;
    allFeedbacks.push(...feedbacks);
    if (feedbacks.length < take) break;
    skip += take;
    await delay(350);
  }

  console.log(`[sync-reviews] user=${userId} Fetched ${allFeedbacks.length} total unanswered reviews`);

  let newCount = 0;
  let autoSentCount = 0;
  const errors: string[] = [];

  for (const fb of allFeedbacks) {
    const wbId = fb.id;

    // Check if already exists for this user
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("wb_id", wbId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) continue;

    const photoLinks = fb.photoLinks || [];
    const hasVideo = !!(fb.video && (fb.video.link || fb.video.previewImage));
    const isEmptyReview = !fb.text && !fb.pros && !fb.cons;

    // Fetch recommendations for this product article (scoped to user)
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
        recommendationInstruction = `\n\nРЕКОМЕНДАЦИИ: В конце ответа ненавязчиво предложи покупателю обратить внимание на другие наши товары:\n${recList}\nУпомяни артикулы, чтобы покупатель мог их найти на WB.`;
      }
    }

    // Generate AI draft
    let aiDraft = "";
    try {
      aiDraft = await generateAIReply(
        OPENROUTER_API_KEY,
        promptTemplate,
        buildReviewText(fb.text, fb.pros, fb.cons),
        fb.productValuation || 5,
        fb.productDetails?.productName || fb.subjectName || "Товар",
        photoLinks.length,
        hasVideo,
        fb.userName || "",
        isEmptyReview,
        recommendationInstruction
      );
    } catch (e) {
      console.error(`AI generation failed for ${wbId}:`, e);
      errors.push(`AI error for ${wbId}: ${e.message}`);
    }

    let status = "pending";
    const rating = fb.productValuation || 5;
    const ratingKey = String(rating);
    const modeForRating = replyModes[ratingKey] || "manual";

    // Auto-reply if mode is "auto" for this rating and draft generated
    if (modeForRating === "auto" && aiDraft) {
      try {
        await sendWBAnswer(WB_API_KEY, wbId, aiDraft);
        status = "auto";
        autoSentCount++;
        await delay(350);
      } catch (e) {
        console.error(`Auto-reply failed for ${wbId}:`, e);
        errors.push(`Send error for ${wbId}: ${e.message}`);
        status = "pending";
      }
    }

    // Save to DB with user_id
    const { error: insertError } = await supabase.from("reviews").insert({
      wb_id: wbId,
      user_id: userId,
      rating: fb.productValuation || 5,
      author_name: fb.userName || "Покупатель",
      text: fb.text || null,
      pros: fb.pros || null,
      cons: fb.cons || null,
      product_name: fb.productDetails?.productName || fb.subjectName || "Товар",
      product_article: String(fb.productDetails?.nmId || fb.nmId || ""),
      photo_links: photoLinks,
      has_video: hasVideo,
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

  // Retry pending reviews that should be auto-sent (scoped to user)
  const { data: pendingReviews } = await supabase
    .from("reviews")
    .select("id, wb_id, rating, ai_draft")
    .eq("status", "pending")
    .eq("user_id", userId)
    .not("ai_draft", "is", null);

  if (pendingReviews && pendingReviews.length > 0) {
    console.log(`[sync-reviews] user=${userId} Found ${pendingReviews.length} pending reviews with AI drafts`);
    for (const pr of pendingReviews) {
      const ratingKey = String(pr.rating);
      const modeForRating = replyModes[ratingKey] || "manual";

      if (modeForRating === "auto" && pr.ai_draft) {
        try {
          await sendWBAnswer(WB_API_KEY, pr.wb_id, pr.ai_draft);
          await supabase
            .from("reviews")
            .update({ status: "auto", sent_answer: pr.ai_draft, updated_at: new Date().toISOString() })
            .eq("id", pr.id);
          autoSentCount++;
          await delay(350);
        } catch (e) {
          console.error(`[sync-reviews] Auto-retry failed for ${pr.wb_id}:`, e);
          errors.push(`Auto-retry error for ${pr.wb_id}: ${e.message}`);
        }
      }
    }
  }

  // Update last_sync_at
  await supabase
    .from("settings")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", userSettings.id);

  return {
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

    // Determine mode: single user (auth header) or cron (all users)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    if (userId) {
      // Single user mode
      const { data: settings } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!settings?.wb_api_key) {
        throw new Error("WB API ключ не настроен. Добавьте его в настройках.");
      }

      const result = await processUserReviews(supabase, settings as UserSettings, OPENROUTER_API_KEY);

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Cron mode — process ALL users with API keys
      console.log("[sync-reviews] Cron mode — processing all users");
      const { data: allSettings } = await supabase
        .from("settings")
        .select("*")
        .not("wb_api_key", "is", null);

      if (!allSettings || allSettings.length === 0) {
        console.log("[sync-reviews] No users with API keys configured");
        return new Response(
          JSON.stringify({ success: true, message: "No users to process" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const settings of allSettings) {
        if (!settings.user_id) continue;
        try {
          console.log(`[sync-reviews] Processing user ${settings.user_id}`);
          const result = await processUserReviews(supabase, settings as UserSettings, OPENROUTER_API_KEY);
          results.push(result);
        } catch (e) {
          console.error(`[sync-reviews] Error processing user ${settings.user_id}:`, e);
          results.push({ userId: settings.user_id, error: e.message });
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
