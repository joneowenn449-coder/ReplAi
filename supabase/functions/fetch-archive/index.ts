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
  const resp = await fetch(url, { headers: { Authorization: apiKey } });
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

    // Resolve user_id and cabinet_id
    let userId: string;
    let cabinetId: string | null = null;
    const body = await req.json().catch(() => ({}));

    if (body.user_id) {
      userId = body.user_id;
      cabinetId = body.cabinet_id || null;
    } else {
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
      userId = user.id;
    }

    // Get WB API key from cabinet or settings
    let WB_API_KEY: string | null = null;

    if (cabinetId) {
      const { data: cabinet } = await supabase
        .from("wb_cabinets")
        .select("wb_api_key")
        .eq("id", cabinetId)
        .maybeSingle();
      WB_API_KEY = cabinet?.wb_api_key || null;
    }

    if (!WB_API_KEY) {
      // Try active cabinet
      const { data: activeCab } = await supabase
        .from("wb_cabinets")
        .select("id, wb_api_key")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (activeCab?.wb_api_key) {
        WB_API_KEY = activeCab.wb_api_key;
        cabinetId = activeCab.id;
      }
    }

    if (!WB_API_KEY) {
      // Fallback to settings
      const { data: settings } = await supabase
        .from("settings")
        .select("wb_api_key")
        .eq("user_id", userId)
        .maybeSingle();
      WB_API_KEY = settings?.wb_api_key || null;
    }

    if (!WB_API_KEY) {
      throw new Error("WB API ключ не настроен.");
    }

    let skip = 0;
    const take = 50;
    let totalFetched = 0;
    let totalInserted = 0;
    let hasMore = true;

    while (hasMore) {
      const wbData = await fetchAnsweredReviews(WB_API_KEY, skip, take);
      const feedbacks = wbData?.data?.feedbacks || [];

      if (feedbacks.length === 0) { hasMore = false; break; }
      totalFetched += feedbacks.length;

      const wbIds = feedbacks.map((fb: any) => fb.id);
      const { data: existingRows } = await supabase
        .from("reviews")
        .select("wb_id")
        .eq("user_id", userId)
        .in("wb_id", wbIds);

      const existingIds = new Set((existingRows || []).map((r: any) => r.wb_id));

      const newRows = feedbacks
        .filter((fb: any) => !existingIds.has(fb.id))
        .map((fb: any) => ({
          wb_id: fb.id,
          user_id: userId,
          cabinet_id: cabinetId || null,
          rating: fb.productValuation || 5,
          author_name: fb.userName || "Покупатель",
          text: fb.text || null,
          pros: fb.pros || null,
          cons: fb.cons || null,
          product_name: fb.productDetails?.productName || fb.subjectName || "Товар",
          product_article: String(fb.productDetails?.nmId || fb.nmId || ""),
          photo_links: fb.photoLinks || [],
          has_video: !!(fb.video && (fb.video.link || fb.video.previewImage)),
          created_date: fb.createdDate || new Date().toISOString(),
          status: "archived",
          ai_draft: null,
          sent_answer: fb.answer?.text || null,
        }));

      if (newRows.length > 0) {
        const { error: insertError } = await supabase.from("reviews").insert(newRows);
        if (insertError) throw new Error(`DB error: ${insertError.message}`);
        totalInserted += newRows.length;
      }

      if (feedbacks.length < take) { hasMore = false; } else { skip += take; await delay(350); }
    }

    return new Response(
      JSON.stringify({ success: true, fetched: totalFetched, inserted: totalInserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-archive error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
