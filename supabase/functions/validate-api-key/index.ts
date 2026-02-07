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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error");
    }

    const { api_key } = await req.json();
    if (!api_key || typeof api_key !== "string" || api_key.trim().length < 10) {
      throw new Error("Некорректный API-ключ");
    }

    const trimmedKey = api_key.trim();

    // Test the key against WB API
    const testResp = await fetch(
      "https://feedbacks-api.wildberries.ru/api/v1/feedbacks?isAnswered=false&take=1&skip=0",
      { headers: { Authorization: trimmedKey } }
    );

    if (!testResp.ok) {
      const body = await testResp.text();
      console.error(`WB API validation failed: ${testResp.status} ${body}`);
      return new Response(
        JSON.stringify({
          valid: false,
          error: testResp.status === 401
            ? "Неверный API-ключ"
            : `Ошибка WB API: ${testResp.status}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consume response body
    await testResp.text();

    // Key is valid — save to settings
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: settings } = await supabase
      .from("settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (settings) {
      const { error } = await supabase
        .from("settings")
        .update({ wb_api_key: trimmedKey })
        .eq("id", settings.id);
      if (error) throw new Error(`DB error: ${error.message}`);
    } else {
      const { error } = await supabase
        .from("settings")
        .insert({ wb_api_key: trimmedKey });
      if (error) throw new Error(`DB error: ${error.message}`);
    }

    // Test chat API access
    let chatAccess = false;
    try {
      const chatResp = await fetch(
        "https://buyer-chat-api.wildberries.ru/api/v1/seller/chats",
        { headers: { Authorization: trimmedKey } }
      );
      const chatBody = await chatResp.text();
      console.log(`Chat API test: status=${chatResp.status}, body=${chatBody.slice(0, 200)}`);
      chatAccess = chatResp.ok;
    } catch (chatErr) {
      console.error("Chat API test failed:", chatErr);
    }

    // Return masked key
    const masked =
      trimmedKey.length > 8
        ? trimmedKey.slice(0, 4) + "****...****" + trimmedKey.slice(-4)
        : "****";

    // Check if this is first setup (no reviews yet) — auto-import archive
    let archiveImported = false;
    try {
      const { count, error: countError } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true });

      if (!countError && (count === null || count === 0)) {
        console.log("First setup detected — triggering archive import");
        const archiveResp = await fetch(
          `${SUPABASE_URL}/functions/v1/fetch-archive`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({}),
          }
        );
        const archiveData = await archiveResp.json();
        console.log("Archive import result:", archiveData);
        archiveImported = archiveResp.ok && archiveData?.success;
      }
    } catch (archiveErr) {
      console.error("Archive auto-import failed (non-critical):", archiveErr);
    }

    return new Response(
      JSON.stringify({
        valid: true,
        masked_key: masked,
        chat_access: chatAccess,
        archive_imported: archiveImported,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("validate-api-key error:", e);
    return new Response(
      JSON.stringify({ valid: false, error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
