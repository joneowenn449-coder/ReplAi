import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WB_BASE_URL = "https://feedbacks-api.wildberries.ru";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAnsweredReviews(apiKey: string, skip = 0, take = 50) {
  const url = `${WB_BASE_URL}/api/v1/feedbacks?isAnswered=true&take=${take}&skip=${skip}`;
  const resp = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`WB API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get settings for WB API key
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const WB_API_KEY = settings?.wb_api_key || Deno.env.get("WB_API_KEY");
    if (!WB_API_KEY) {
      throw new Error("WB API ключ не настроен. Добавьте его в настройках.");
    }

    let skip = 0;
    const take = 50;
    let totalFetched = 0;
    let totalInserted = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching archive page: skip=${skip}, take=${take}`);

      const wbData = await fetchAnsweredReviews(WB_API_KEY, skip, take);
      const feedbacks = wbData?.data?.feedbacks || [];

      if (feedbacks.length === 0) {
        hasMore = false;
        break;
      }

      totalFetched += feedbacks.length;

      // Collect wb_ids to check for existing
      const wbIds = feedbacks.map((fb: any) => fb.id);
      const { data: existingRows } = await supabase
        .from("reviews")
        .select("wb_id")
        .in("wb_id", wbIds);

      const existingIds = new Set((existingRows || []).map((r: any) => r.wb_id));

      const newRows = feedbacks
        .filter((fb: any) => !existingIds.has(fb.id))
        .map((fb: any) => ({
          wb_id: fb.id,
          rating: fb.productValuation || 5,
          author_name: fb.userName || "Покупатель",
          text: fb.text || null,
          product_name:
            fb.productDetails?.productName || fb.subjectName || "Товар",
          product_article: String(
            fb.productDetails?.nmId || fb.nmId || ""
          ),
          photo_links: fb.photoLinks || [],
          created_date: fb.createdDate || new Date().toISOString(),
          status: "archived",
          ai_draft: null,
          sent_answer: fb.answer?.text || null,
        }));

      if (newRows.length > 0) {
        const { error: insertError } = await supabase
          .from("reviews")
          .insert(newRows);

        if (insertError) {
          console.error("Batch insert error:", insertError);
          throw new Error(`DB error: ${insertError.message}`);
        }
        totalInserted += newRows.length;
      }

      // If we got fewer than `take`, there are no more pages
      if (feedbacks.length < take) {
        hasMore = false;
      } else {
        skip += take;
        // Rate limit: 350ms between requests
        await delay(350);
      }
    }

    console.log(
      `Archive fetch complete: ${totalFetched} fetched, ${totalInserted} inserted`
    );

    return new Response(
      JSON.stringify({
        success: true,
        fetched: totalFetched,
        inserted: totalInserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("fetch-archive error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
