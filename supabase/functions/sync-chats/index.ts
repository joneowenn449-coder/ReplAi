import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WB_CHAT_BASE = "https://buyer-chat-api.wildberries.ru";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChats(apiKey: string) {
  const resp = await fetch(`${WB_CHAT_BASE}/api/v1/seller/chats`, {
    headers: { Authorization: apiKey },
  });
  const rawBody = await resp.text();
  if (!resp.ok) throw new Error(`WB Chats API error ${resp.status}: ${rawBody}`);
  try { return JSON.parse(rawBody); } catch { throw new Error(`WB Chats non-JSON: ${rawBody.slice(0, 200)}`); }
}

async function fetchEvents(apiKey: string, next: number = 0) {
  const url = `${WB_CHAT_BASE}/api/v1/seller/events${next ? `?next=${next}` : ""}`;
  const resp = await fetch(url, { headers: { Authorization: apiKey } });
  const rawBody = await resp.text();
  if (!resp.ok) throw new Error(`WB Events API error ${resp.status}: ${rawBody}`);
  try { return JSON.parse(rawBody); } catch { throw new Error(`WB Events non-JSON: ${rawBody.slice(0, 200)}`); }
}

interface CabinetSettings {
  id: string;
  user_id: string;
  wb_api_key: string;
}

async function processCabinetChats(supabase: any, cabinet: CabinetSettings) {
  const userId = cabinet.user_id;
  const cabinetId = cabinet.id;
  const WB_API_KEY = cabinet.wb_api_key;

  const chatsData = await fetchChats(WB_API_KEY);
  const chats = chatsData?.chats || chatsData?.result || [];

  console.log(`[sync-chats] cabinet=${cabinetId} Fetched ${chats.length} chats`);

  let upsertedChats = 0;
  let newMessages = 0;
  const errors: string[] = [];
  const chatsWithNewClientMessages = new Set<string>();

  for (const chat of chats) {
    const chatId = chat.chatID || chat.chatId;
    if (!chatId) continue;

    const { error: upsertError } = await supabase
      .from("chats")
      .upsert(
        {
          chat_id: chatId,
          user_id: userId,
          cabinet_id: cabinetId,
          reply_sign: chat.replySign || null,
          client_name: chat.userName || chat.clientName || "Покупатель",
          product_nm_id: chat.nmId || chat.productNmId || null,
          product_name: chat.productName || chat.subjectName || "",
        },
        { onConflict: "chat_id" }
      );

    if (upsertError) {
      errors.push(`Chat upsert error: ${upsertError.message}`);
    } else {
      upsertedChats++;
    }
  }

  await delay(1000);

  // Fetch events (messages)
  let next = 0;
  let hasMore = true;
  let pagesProcessed = 0;
  const maxPages = 10;

  while (hasMore && pagesProcessed < maxPages) {
    const eventsData = await fetchEvents(WB_API_KEY, next);
    const eventsContainer = eventsData?.result || eventsData;
    const events = eventsContainer?.events || [];

    if (events.length === 0) { hasMore = false; break; }

    for (const event of events) {
      const eventId = event.id || event.eventID;
      const chatId = event.chatID || event.chatId;
      if (!eventId || !chatId) continue;

      const { data: chatExists } = await supabase
        .from("chats")
        .select("chat_id")
        .eq("chat_id", chatId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!chatExists) continue;

      const attachments: Array<{ type: string; id: string; name?: string }> = [];
      if (event.file) {
        attachments.push({ type: event.file.type || "file", id: event.file.id || "", name: event.file.name || "" });
      }
      if (event.images && Array.isArray(event.images)) {
        for (const img of event.images) {
          attachments.push({ type: "image", id: img.id || img, name: img.name || "" });
        }
      }

      const sender =
        event.isManager || event.is_manager ||
        event.senderType === "seller" ||
        event.direction === "out" ||
        event.message?.senderType === "seller"
          ? "seller" : "client";

      const msgData = event.message;
      const messageText = typeof msgData === "string" ? msgData : (msgData?.text || event.text || null);
      const sentAt = event.createdAt || event.created_at || new Date().toISOString();

      // Dedup seller messages
      if (sender === "seller" && messageText) {
        const sentAtMs = new Date(sentAt).getTime();
        const windowStart = new Date(sentAtMs - 120000).toISOString();
        const windowEnd = new Date(sentAtMs + 120000).toISOString();

        const { data: existing } = await supabase
          .from("chat_messages")
          .select("id, event_id")
          .eq("chat_id", chatId)
          .eq("user_id", userId)
          .eq("sender", "seller")
          .eq("text", messageText)
          .gte("sent_at", windowStart)
          .lte("sent_at", windowEnd)
          .limit(1)
          .maybeSingle();

        if (existing) {
          if (existing.event_id.startsWith("seller_")) {
            await supabase.from("chat_messages").update({ event_id: String(eventId) }).eq("id", existing.id);
          }
          continue;
        }
      }

      const { data: insertedRows, error: msgError } = await supabase
        .from("chat_messages")
        .upsert(
          {
            chat_id: chatId,
            user_id: userId,
            cabinet_id: cabinetId,
            event_id: String(eventId),
            sender,
            text: messageText,
            attachments: attachments.length > 0 ? attachments : [],
            sent_at: sentAt,
          },
          { onConflict: "event_id", ignoreDuplicates: true }
        )
        .select("event_id");

      if (msgError) {
        errors.push(`Message error: ${msgError.message}`);
      } else if (insertedRows && insertedRows.length > 0) {
        newMessages++;
        if (sender === "client") chatsWithNewClientMessages.add(chatId);
      }
    }

    next = eventsContainer?.next || 0;
    hasMore = !!next;
    pagesProcessed++;
    if (hasMore) await delay(1000);
  }

  // Update last_message for chats
  const { data: allChats } = await supabase.from("chats").select("chat_id").eq("user_id", userId).eq("cabinet_id", cabinetId);
  if (allChats) {
    for (const chat of allChats) {
      const { data: lastMsg } = await supabase
        .from("chat_messages")
        .select("text, sent_at, sender")
        .eq("chat_id", chat.chat_id)
        .eq("user_id", userId)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMsg) {
        const updatePayload: Record<string, unknown> = {
          last_message_text: lastMsg.text || "📎 Вложение",
          last_message_at: lastMsg.sent_at,
        };
        if (chatsWithNewClientMessages.has(chat.chat_id)) {
          updatePayload.is_read = false;
        }
        await supabase.from("chats").update(updatePayload).eq("chat_id", chat.chat_id).eq("user_id", userId);
      }
    }
  }

  return { cabinetId, userId, chats: upsertedChats, messages: newMessages, errors: errors.length > 0 ? errors : undefined };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase credentials");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (userId) {
      // Single user — active cabinet
      const { data: activeCabinet } = await supabase
        .from("wb_cabinets")
        .select("id, user_id, wb_api_key")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!activeCabinet?.wb_api_key) {
        throw new Error("WB API ключ не настроен. Добавьте его в настройках.");
      }

      const result = await processCabinetChats(supabase, activeCabinet as CabinetSettings);

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Cron mode
      console.log("[sync-chats] Cron mode — processing all cabinets");
      const { data: allCabinets } = await supabase
        .from("wb_cabinets")
        .select("id, user_id, wb_api_key")
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
          const result = await processCabinetChats(supabase, cabinet as CabinetSettings);
          results.push(result);
        } catch (e) {
          results.push({ cabinetId: cabinet.id, userId: cabinet.user_id, error: e.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("sync-chats error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
