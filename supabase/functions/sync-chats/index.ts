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

function maskKey(key: string): string {
  if (key.length > 8) return key.slice(0, 4) + "****" + key.slice(-4);
  return "****";
}

async function fetchChats(apiKey: string) {
  console.log(`[sync-chats] Fetching chats with key: ${maskKey(apiKey)}`);
  const resp = await fetch(`${WB_CHAT_BASE}/api/v1/seller/chats`, {
    headers: { Authorization: apiKey },
  });
  const rawBody = await resp.text();
  console.log(`[sync-chats] WB Chats API response status: ${resp.status}, body: ${rawBody.slice(0, 500)}`);
  if (!resp.ok) {
    throw new Error(`WB Chats API error ${resp.status}: ${rawBody}`);
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(`WB Chats API returned non-JSON: ${rawBody.slice(0, 200)}`);
  }
}

async function fetchEvents(apiKey: string, next: number = 0) {
  const url = `${WB_CHAT_BASE}/api/v1/seller/events${next ? `?next=${next}` : ""}`;
  const resp = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  const rawBody = await resp.text();
  console.log(`[sync-chats] WB Events API response status: ${resp.status}, body: ${rawBody.slice(0, 500)}`);
  if (!resp.ok) {
    throw new Error(`WB Events API error ${resp.status}: ${rawBody}`);
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(`WB Events API returned non-JSON: ${rawBody.slice(0, 200)}`);
  }
}

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

    const chatsData = await fetchChats(WB_API_KEY);
    const chats = chatsData?.chats || chatsData?.result || [];

    console.log(`Fetched ${chats.length} chats from WB`);

    let upsertedChats = 0;
    let newMessages = 0;
    const errors: string[] = [];

    // Step 2: Upsert chats
    for (const chat of chats) {
      const chatId = chat.chatID || chat.chatId;
      if (!chatId) continue;

      const { error: upsertError } = await supabase
        .from("chats")
        .upsert(
          {
            chat_id: chatId,
            reply_sign: chat.replySign || null,
            client_name: chat.userName || chat.clientName || "Покупатель",
            product_nm_id: chat.nmId || chat.productNmId || null,
            product_name: chat.productName || chat.subjectName || "",
          },
          { onConflict: "chat_id" }
        );

      if (upsertError) {
        console.error(`Upsert error for chat ${chatId}:`, upsertError);
        errors.push(`Chat upsert error: ${upsertError.message}`);
      } else {
        upsertedChats++;
      }
    }

    await delay(1000);

    // Step 3: Fetch events (messages) with pagination
    let next = 0;
    let hasMore = true;
    let pagesProcessed = 0;
    const maxPages = 10; // Safety limit
    const chatsWithNewClientMessages = new Set<string>();

    while (hasMore && pagesProcessed < maxPages) {
      const eventsData = await fetchEvents(WB_API_KEY, next);
      // WB API returns { result: { events: [...], next: N } }
      const eventsContainer = eventsData?.result || eventsData;
      const events = eventsContainer?.events || [];

      if (events.length === 0) {
        hasMore = false;
        break;
      }

      for (const event of events) {
        const eventId = event.id || event.eventID;
        const chatId = event.chatID || event.chatId;
        if (!eventId || !chatId) continue;

        // Check if chat exists in our DB
        const { data: chatExists } = await supabase
          .from("chats")
          .select("chat_id")
          .eq("chat_id", chatId)
          .maybeSingle();

        if (!chatExists) continue;

        // Parse attachments
        const attachments: Array<{ type: string; id: string; name?: string }> = [];
        if (event.file) {
          attachments.push({
            type: event.file.type || "file",
            id: event.file.id || "",
            name: event.file.name || "",
          });
        }
        if (event.images && Array.isArray(event.images)) {
          for (const img of event.images) {
            attachments.push({
              type: "image",
              id: img.id || img,
              name: img.name || "",
            });
          }
        }

        const sender = event.isManager || event.is_manager ? "seller" : "client";
        const msgData = event.message;
        const messageText = typeof msgData === "string" ? msgData : (msgData?.text || event.text || null);
        const sentAt = event.createdAt || event.created_at || new Date().toISOString();

        // Insert message — ignoreDuplicates: true means existing messages won't be overwritten
        const { data: insertedRows, error: msgError } = await supabase
          .from("chat_messages")
          .upsert(
            {
              chat_id: chatId,
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
          console.error(`Message insert error for event ${eventId}:`, msgError);
          errors.push(`Message error: ${msgError.message}`);
        } else if (insertedRows && insertedRows.length > 0) {
          // Row was actually inserted (not a duplicate)
          newMessages++;
          if (sender === "client") {
            chatsWithNewClientMessages.add(chatId);
          }
        }
      }

      // Check for more pages
      next = eventsContainer?.next || 0;
      hasMore = !!next;
      pagesProcessed++;

      if (hasMore) {
        await delay(1000);
      }
    }

    console.log(`[sync-chats] New client messages in chats: ${[...chatsWithNewClientMessages].join(", ") || "none"}`);

    // Step 4: Update last_message_text, last_message_at, and is_read for each chat
    const { data: allChats } = await supabase
      .from("chats")
      .select("chat_id");

    if (allChats) {
      for (const chat of allChats) {
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("text, sent_at, sender")
          .eq("chat_id", chat.chat_id)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMsg) {
          const updatePayload: Record<string, unknown> = {
            last_message_text: lastMsg.text || "📎 Вложение",
            last_message_at: lastMsg.sent_at,
          };

          // Only mark as unread if there are genuinely new client messages
          if (chatsWithNewClientMessages.has(chat.chat_id)) {
            updatePayload.is_read = false;
          }

          await supabase
            .from("chats")
            .update(updatePayload)
            .eq("chat_id", chat.chat_id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        chats: upsertedChats,
        messages: newMessages,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("sync-chats error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
