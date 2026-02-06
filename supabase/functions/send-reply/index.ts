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
    const WB_API_KEY = Deno.env.get("WB_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!WB_API_KEY) throw new Error("WB_API_KEY is not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const { review_id, answer_text } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get review from DB
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", review_id)
      .maybeSingle();

    if (fetchError) throw new Error(`DB error: ${fetchError.message}`);
    if (!review) throw new Error("Review not found");

    const textToSend = answer_text || review.ai_draft;
    if (!textToSend) throw new Error("No answer text provided");

    // Send to WB
    const resp = await fetch("https://feedbacks-api.wildberries.ru/api/v1/feedbacks", {
      method: "PATCH",
      headers: {
        Authorization: WB_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: review.wb_id, text: textToSend }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`WB API error ${resp.status}: ${body}`);
    }

    // Update DB
    const { error: updateError } = await supabase
      .from("reviews")
      .update({
        status: "sent",
        sent_answer: textToSend,
      })
      .eq("id", review_id);

    if (updateError) throw new Error(`DB update error: ${updateError.message}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
