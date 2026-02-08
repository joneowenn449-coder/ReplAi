import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReviewRow {
  rating: number;
  author_name: string;
  text: string | null;
  pros: string | null;
  cons: string | null;
  product_name: string;
  product_article: string;
  created_date: string;
}

interface ProductStats {
  product_article: string;
  product_name: string;
  count: number;
  avg_rating: number;
  ratings: Record<number, number>;
}

async function getProductStats(supabase: any): Promise<ProductStats[]> {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("product_article, product_name, rating")
    .order("created_date", { ascending: false });

  if (error) throw error;

  const statsMap = new Map<string, ProductStats>();
  for (const r of reviews || []) {
    let s = statsMap.get(r.product_article);
    if (!s) {
      s = {
        product_article: r.product_article,
        product_name: r.product_name,
        count: 0,
        avg_rating: 0,
        ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
      statsMap.set(r.product_article, s);
    }
    s.count++;
    s.ratings[r.rating] = (s.ratings[r.rating] || 0) + 1;
  }

  for (const s of statsMap.values()) {
    const total = Object.entries(s.ratings).reduce(
      (sum, [star, cnt]) => sum + Number(star) * cnt,
      0
    );
    s.avg_rating = Math.round((total / s.count) * 100) / 100;
  }

  return Array.from(statsMap.values());
}

async function getReviewsByArticle(
  supabase: any,
  article: string,
  limit = 50
): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating, author_name, text, pros, cons, product_name, product_article, created_date")
    .eq("product_article", article)
    .order("created_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function getNegativeReviews(
  supabase: any,
  limit = 30
): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating, author_name, text, pros, cons, product_name, product_article, created_date")
    .lte("rating", 3)
    .order("created_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function getPositiveReviews(
  supabase: any,
  limit = 30
): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating, author_name, text, pros, cons, product_name, product_article, created_date")
    .gte("rating", 4)
    .not("pros", "is", null)
    .order("created_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

function formatReviews(reviews: ReviewRow[]): string {
  return reviews
    .map((r, i) => {
      const parts = [`${i + 1}. ⭐ ${r.rating}/5 — ${r.author_name}`];
      if (r.pros) parts.push(`   Плюсы: "${r.pros}"`);
      if (r.cons) parts.push(`   Минусы: "${r.cons}"`);
      if (r.text) parts.push(`   Комментарий: "${r.text}"`);
      parts.push(`   Товар: ${r.product_name} (${r.product_article})`);
      return parts.join("\n");
    })
    .join("\n\n");
}

function detectIntent(message: string): {
  articles: string[];
  wantsNegative: boolean;
  wantsPositive: boolean;
} {
  const articleRegex = /\b(\d{6,})\b/g;
  const articles: string[] = [];
  let match;
  while ((match = articleRegex.exec(message)) !== null) {
    articles.push(match[1]);
  }

  const negativeKeywords = [
    "жалоб", "проблем", "негатив", "плох", "минус", "недостат",
    "низк", "ниже 3", "1 звезд", "2 звезд", "3 звезд", "критик",
  ];
  const positiveKeywords = [
    "хвал", "преимущ", "плюс", "достоинств", "лучш", "положительн",
    "высок", "5 звезд", "4 звезд", "нрав",
  ];

  const lower = message.toLowerCase();
  const wantsNegative = negativeKeywords.some((kw) => lower.includes(kw));
  const wantsPositive = positiveKeywords.some((kw) => lower.includes(kw));

  return { articles, wantsNegative, wantsPositive };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract intent from the last user message
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
    const userText = lastUserMessage?.content || "";
    const { articles, wantsNegative, wantsPositive } = detectIntent(userText);

    // Always fetch product stats
    const productStats = await getProductStats(supabase);
    const statsBlock = productStats
      .map(
        (s) =>
          `- Артикул ${s.product_article}: "${s.product_name}" — ${s.count} отзывов, средний рейтинг ${s.avg_rating} (★1: ${s.ratings[1]}, ★2: ${s.ratings[2]}, ★3: ${s.ratings[3]}, ★4: ${s.ratings[4]}, ★5: ${s.ratings[5]})`
      )
      .join("\n");

    // Build context parts
    const contextParts: string[] = [
      `Товары в базе (всего ${productStats.reduce((s, p) => s + p.count, 0)} отзывов):\n${statsBlock}`,
    ];

    // Fetch article-specific reviews
    for (const article of articles) {
      const reviews = await getReviewsByArticle(supabase, article);
      if (reviews.length > 0) {
        contextParts.push(
          `\nОтзывы по артикулу ${article} (последние ${reviews.length}):\n${formatReviews(reviews)}`
        );
      } else {
        contextParts.push(`\nАртикул ${article} не найден в базе.`);
      }
    }

    // Fetch negative reviews if intent detected and no specific article
    if (wantsNegative && articles.length === 0) {
      const negReviews = await getNegativeReviews(supabase);
      if (negReviews.length > 0) {
        contextParts.push(
          `\nОтзывы с низким рейтингом (1-3 звезды, последние ${negReviews.length}):\n${formatReviews(negReviews)}`
        );
      }
    }

    // Fetch positive reviews if intent detected and no specific article
    if (wantsPositive && articles.length === 0) {
      const posReviews = await getPositiveReviews(supabase);
      if (posReviews.length > 0) {
        contextParts.push(
          `\nПоложительные отзывы (4-5 звёзд, последние ${posReviews.length}):\n${formatReviews(posReviews)}`
        );
      }
    }

    const systemPrompt = `Ты — AI-аналитик по отзывам маркетплейса Wildberries. У тебя есть полный доступ к базе отзывов покупателей.

Твои возможности:
- Анализировать отзывы по конкретным товарам (по артикулу)
- Выявлять основные жалобы и преимущества товаров
- Давать статистику по рейтингам
- Находить паттерны в отзывах
- Отвечать на любые вопросы о товарах и мнении покупателей

Правила:
- Отвечай структурированно, используй списки и заголовки
- Приводи конкретные цитаты из отзывов когда это уместно
- Указывай артикулы товаров в ответах
- Если спрашивают о товаре которого нет в базе — скажи об этом
- Отвечай на русском языке
- Будь кратким но информативным

Данные из базы отзывов:

${contextParts.join("\n")}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Превышен лимит запросов. Попробуйте позже." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Необходимо пополнить баланс AI-кредитов." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Ошибка AI-сервиса" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
