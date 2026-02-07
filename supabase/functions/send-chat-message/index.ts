import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WB_CHAT_BASE = "https://buyer-chat-api.wildberries.ru";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const { chat_id, message } = await req.json();
    if (!chat_id) throw new Error("chat_id is required");
    if (!message || !message.trim()) throw new Error("message is required");

    if (message.length > 1000) {
      throw new Error("Сообщение не должно превышать 1000 символов");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve WB API key
    const { data: settings } = await supabase
      .from("settings")
      .select("wb_api_key")
      .limit(1)
      .maybeSingle();

    const WB_API_KEY = settings?.wb_api_key || Deno.env.get("WB_API_KEY");
    if (!WB_API_KEY) {
      throw new Error("WB API ключ не настроен. Добавьте его в настройках.");
    }

    // Get chat to obtain reply_sign
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("reply_sign")
      .eq("chat_id", chat_id)
      .maybeSingle();

    if (chatError) throw new Error(`DB error: ${chatError.message}`);
    if (!chat) throw new Error("Чат не найден");
    if (!chat.reply_sign) throw new Error("Нет подписи для ответа (reply_sign). Синхронизируйте чаты.");

    // Send via WB API using multipart/form-data
    const formData = new FormData();
    formData.append("replySign", chat.reply_sign);
    formData.append("message", message.trim());

    const resp = await fetch(`${WB_CHAT_BASE}/api/v1/seller/message`, {
      method: "POST",
      headers: {
        Authorization: WB_API_KEY,
      },
      body: formData,
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`WB Chat API error ${resp.status}: ${body}`);
    }

    // Save sent message to DB
    const eventId = `seller_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        chat_id,
        event_id: eventId,
        sender: "seller",
        text: message.trim(),
        attachments: [],
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to save sent message:", insertError);
    }

    // Update chat's last message
    await supabase
      .from("chats")
      .update({
        last_message_text: message.trim(),
        last_message_at: new Date().toISOString(),
      })
      .eq("chat_id", chat_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-chat-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
