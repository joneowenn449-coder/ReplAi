import { Request, Response } from "express";
import { storage } from "./storage";
import crypto from "crypto";

const WB_FEEDBACKS_URL = "https://feedbacks-api.wildberries.ru";
const WB_CHAT_BASE = "https://buyer-chat-api.wildberries.ru";

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

function buildReviewText(text?: string | null, pros?: string | null, cons?: string | null): string {
  const parts: string[] = [];
  if (text) parts.push(`Комментарий: ${text}`);
  if (pros) parts.push(`Плюсы: ${pros}`);
  if (cons) parts.push(`Недостатки: ${cons}`);
  return parts.length > 0 ? parts.join("\n\n") : "";
}

async function fetchWBReviews(apiKey: string, skip = 0, take = 50) {
  const url = `${WB_FEEDBACKS_URL}/api/v1/feedbacks?isAnswered=false&take=${take}&skip=${skip}`;
  const resp = await fetch(url, { headers: { Authorization: apiKey } });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`WB API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function fetchWBArchiveReviews(apiKey: string, skip = 0, take = 50) {
  const url = `${WB_FEEDBACKS_URL}/api/v1/feedbacks?isAnswered=true&take=${take}&skip=${skip}`;
  const resp = await fetch(url, { headers: { Authorization: apiKey } });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`WB Archive API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function sendWBAnswer(apiKey: string, feedbackId: string, text: string) {
  const resp = await fetch(`${WB_FEEDBACKS_URL}/api/v1/feedbacks/answer`, {
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

async function processCabinetReviews(
  cabinet: { id: string; userId: string; wbApiKey: string | null; aiPromptTemplate: string | null; replyModes: any; brandName: string | null },
  openrouterKey: string
) {
  const userId = cabinet.userId;
  const cabinetId = cabinet.id;
  const WB_API_KEY = cabinet.wbApiKey!;
  const defaultModes: Record<string, string> = { "1": "manual", "2": "manual", "3": "manual", "4": "manual", "5": "manual" };
  const replyModes = (cabinet.replyModes as Record<string, string>) || defaultModes;

  let currentBalance = await storage.getTokenBalance(userId);
  const promptTemplate = cabinet.aiPromptTemplate ||
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

    const existing = await storage.getReviewByWbId(wbId, userId, cabinetId);
    if (existing) continue;

    const photoLinks = fb.photoLinks || [];
    const hasVideo = !!(fb.video && (fb.video.link || fb.video.previewImage));
    const isEmptyReview = !fb.text && !fb.pros && !fb.cons;

    const productArticle = String(fb.productDetails?.nmId || fb.nmId || "");
    let recommendationInstruction = "";
    if (productArticle) {
      const recommendations = await storage.getRecommendationsByArticle(productArticle, cabinetId);
      if (recommendations && recommendations.length > 0) {
        const recList = recommendations
          .map((r) => `- Артикул ${r.targetArticle}${r.targetName ? `: "${r.targetName}"` : ""}`)
          .join("\n");
        recommendationInstruction = `\n\nРЕКОМЕНДАЦИИ: предложи товары:\n${recList}`;
      }
    }

    const reviewBrandName = fb.productDetails?.brandName || "";
    const effectiveBrand = reviewBrandName || cabinet.brandName || "";
    const isRefusal = detectRefusal(fb.text, fb.pros, fb.cons);

    let aiDraft = "";
    try {
      aiDraft = await generateAIReply(
        openrouterKey, promptTemplate,
        buildReviewText(fb.text, fb.pros, fb.cons),
        fb.productValuation || 5,
        fb.productDetails?.productName || fb.subjectName || "Товар",
        photoLinks.length, hasVideo, fb.userName || "",
        isEmptyReview, recommendationInstruction, isRefusal, effectiveBrand
      );
    } catch (e: any) {
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
          await storage.updateTokenBalance(userId, currentBalance);
          await delay(350);
        } catch (e: any) {
          console.error(`Auto-reply failed for ${wbId}:`, e);
          errors.push(`Send error for ${wbId}: ${e.message}`);
          status = "pending";
        }
      }
    }

    const insertedReview = await storage.insertReview({
      wbId,
      userId,
      cabinetId,
      rating: fb.productValuation || 5,
      authorName: fb.userName || "Покупатель",
      text: fb.text || null,
      pros: fb.pros || null,
      cons: fb.cons || null,
      productName: fb.productDetails?.productName || fb.subjectName || "Товар",
      productArticle: String(fb.productDetails?.nmId || fb.nmId || ""),
      brandName: reviewBrandName,
      photoLinks: photoLinks,
      hasVideo: hasVideo,
      status,
      aiDraft: aiDraft || null,
      sentAnswer: status === "auto" ? aiDraft : null,
    });

    newCount++;
    if (status === "auto" && insertedReview) {
      await storage.insertTokenTransaction({
        userId, amount: -1, type: "usage",
        description: "Автоответ на отзыв", reviewId: insertedReview.id,
      });
    }
  }

  const pendingReviews = await storage.getPendingReviewsForCabinet(userId, cabinetId);
  if (pendingReviews && pendingReviews.length > 0) {
    for (const pr of pendingReviews) {
      const ratingKey = String(pr.rating);
      const modeForRating = replyModes[ratingKey] || "manual";
      if (modeForRating === "auto" && pr.aiDraft) {
        if (currentBalance < 1) continue;
        try {
          await sendWBAnswer(WB_API_KEY, pr.wbId, pr.aiDraft);
          await storage.updateReview(pr.id, {
            status: "auto",
            sentAnswer: pr.aiDraft,
            updatedAt: new Date(),
          });
          autoSentCount++;
          currentBalance -= 1;
          await storage.updateTokenBalance(userId, currentBalance);
          await storage.insertTokenTransaction({
            userId, amount: -1, type: "usage",
            description: "Автоответ на отзыв", reviewId: pr.id,
          });
          await delay(350);
        } catch (e: any) {
          errors.push(`Auto-retry error for ${pr.wbId}: ${e.message}`);
        }
      }
    }
  }

  await storage.updateCabinet(cabinetId, { lastSyncAt: new Date() });

  const userSettings = await storage.getSettings(userId);
  if (userSettings) {
    await storage.updateSettings(userSettings.id, { lastSyncAt: new Date() });
  }

  return {
    cabinetId, userId,
    fetched: allFeedbacks.length,
    new: newCount,
    autoSent: autoSentCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export async function syncReviews(req: Request, res: Response) {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      res.status(503).json({ error: "OPENROUTER_API_KEY не настроен" });
      return;
    }

    const userId = (req as any).userId;

    if (userId) {
      const activeCabinet = await storage.getActiveCabinet(userId);
      if (!activeCabinet?.wbApiKey) {
        res.status(400).json({ error: "WB API ключ не настроен. Добавьте его в настройках." });
        return;
      }

      const result = await processCabinetReviews(activeCabinet, OPENROUTER_API_KEY);
      res.json({ success: true, ...result });
    } else {
      console.log("[sync-reviews] Cron mode — processing all cabinets");
      const allCabinets = await storage.getAllCabinetsWithApiKey();
      if (!allCabinets || allCabinets.length === 0) {
        res.json({ success: true, message: "No cabinets to process" });
        return;
      }

      const results = [];
      for (const cabinet of allCabinets) {
        try {
          const result = await processCabinetReviews(cabinet, OPENROUTER_API_KEY);
          results.push(result);
        } catch (e: any) {
          results.push({ cabinetId: cabinet.id, userId: cabinet.userId, error: e.message });
        }
      }
      res.json({ success: true, results });
    }
  } catch (e: any) {
    console.error("sync-reviews error:", e);
    res.status(500).json({ error: e.message });
  }
}

async function processCabinetChats(
  cabinet: { id: string; userId: string; wbApiKey: string | null }
) {
  const userId = cabinet.userId;
  const cabinetId = cabinet.id;
  const WB_API_KEY = cabinet.wbApiKey!;

  const chatsResp = await fetch(`${WB_CHAT_BASE}/api/v1/seller/chats`, {
    headers: { Authorization: WB_API_KEY },
  });
  const rawBody = await chatsResp.text();
  if (!chatsResp.ok) throw new Error(`WB Chats API error ${chatsResp.status}: ${rawBody}`);
  let chatsData: any;
  try { chatsData = JSON.parse(rawBody); } catch { throw new Error(`WB Chats non-JSON: ${rawBody.slice(0, 200)}`); }

  const chatsList = chatsData?.chats || chatsData?.result || [];
  console.log(`[sync-chats] cabinet=${cabinetId} Fetched ${chatsList.length} chats`);

  let upsertedChats = 0;
  let newMessages = 0;
  const errors: string[] = [];
  const chatsWithNewClientMessages = new Set<string>();

  for (const chat of chatsList) {
    const chatId = chat.chatID || chat.chatId;
    if (!chatId) continue;

    try {
      await storage.upsertChat({
        chatId,
        userId,
        cabinetId,
        replySign: chat.replySign || null,
        clientName: chat.userName || chat.clientName || "Покупатель",
        productNmId: chat.nmId || chat.productNmId || null,
        productName: chat.productName || chat.subjectName || "",
      });
      upsertedChats++;
    } catch (e: any) {
      errors.push(`Chat upsert error: ${e.message}`);
    }
  }

  await delay(1000);

  let next = 0;
  let hasMore = true;
  let pagesProcessed = 0;
  const maxPages = 10;

  while (hasMore && pagesProcessed < maxPages) {
    const eventsUrl = `${WB_CHAT_BASE}/api/v1/seller/events${next ? `?next=${next}` : ""}`;
    const eventsResp = await fetch(eventsUrl, { headers: { Authorization: WB_API_KEY } });
    const eventsRaw = await eventsResp.text();
    if (!eventsResp.ok) throw new Error(`WB Events API error ${eventsResp.status}: ${eventsRaw}`);
    let eventsData: any;
    try { eventsData = JSON.parse(eventsRaw); } catch { throw new Error(`WB Events non-JSON: ${eventsRaw.slice(0, 200)}`); }

    const eventsContainer = eventsData?.result || eventsData;
    const events = eventsContainer?.events || [];
    if (events.length === 0) { hasMore = false; break; }

    for (const event of events) {
      const eventId = event.id || event.eventID;
      const chatId = event.chatID || event.chatId;
      if (!eventId || !chatId) continue;

      const chatExists = await storage.getChatByWbId(chatId, userId);
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

      if (sender === "seller" && messageText) {
        const sentAtMs = new Date(sentAt).getTime();
        const windowStart = new Date(sentAtMs - 120000).toISOString();
        const windowEnd = new Date(sentAtMs + 120000).toISOString();

        const existing = await storage.findDuplicateSellerMessage(chatId, userId, messageText, windowStart, windowEnd);
        if (existing) {
          if (existing.eventId.startsWith("seller_")) {
            await storage.updateChatMessageEventId(existing.id, String(eventId));
          }
          continue;
        }
      }

      try {
        const inserted = await storage.upsertChatMessage({
          chatId,
          userId,
          cabinetId,
          eventId: String(eventId),
          sender,
          text: messageText,
          attachments: attachments.length > 0 ? attachments : [],
          sentAt: new Date(sentAt),
        });
        if (inserted) {
          newMessages++;
          if (sender === "client") chatsWithNewClientMessages.add(chatId);
        }
      } catch (e: any) {
        errors.push(`Message error: ${e.message}`);
      }
    }

    next = eventsContainer?.next || 0;
    hasMore = !!next;
    pagesProcessed++;
    if (hasMore) await delay(1000);
  }

  const allChatsForCabinet = await storage.getChatsByCabinet(userId, cabinetId);
  if (allChatsForCabinet) {
    for (const chat of allChatsForCabinet) {
      const lastMsg = await storage.getLastMessage(chat.chatId, userId);
      if (lastMsg) {
        const updatePayload: Record<string, unknown> = {
          lastMessageText: lastMsg.text || "Вложение",
          lastMessageAt: lastMsg.sentAt,
        };
        if (chatsWithNewClientMessages.has(chat.chatId)) {
          updatePayload.isRead = false;
        }
        await storage.updateChat(chat.chatId, userId, updatePayload);
      }
    }
  }

  return { cabinetId, userId, chats: upsertedChats, messages: newMessages, errors: errors.length > 0 ? errors : undefined };
}

export async function syncChats(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    if (userId) {
      const activeCabinet = await storage.getActiveCabinet(userId);
      if (!activeCabinet?.wbApiKey) {
        res.status(400).json({ error: "WB API ключ не настроен. Добавьте его в настройках." });
        return;
      }
      const result = await processCabinetChats(activeCabinet);
      res.json({ success: true, ...result });
    } else {
      console.log("[sync-chats] Cron mode — processing all cabinets");
      const allCabinets = await storage.getAllCabinetsWithApiKey();
      if (!allCabinets || allCabinets.length === 0) {
        res.json({ success: true, message: "No cabinets to process" });
        return;
      }
      const results = [];
      for (const cabinet of allCabinets) {
        try {
          const result = await processCabinetChats(cabinet);
          results.push(result);
        } catch (e: any) {
          results.push({ cabinetId: cabinet.id, userId: cabinet.userId, error: e.message });
        }
      }
      res.json({ success: true, results });
    }
  } catch (e: any) {
    console.error("sync-chats error:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function sendReply(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const currentBalance = await storage.getTokenBalance(userId);

    if (currentBalance < 1) {
      res.status(402).json({ error: "Недостаточно токенов. Пополните баланс." });
      return;
    }

    const { review_id, answer_text } = req.body;
    if (!review_id) {
      res.status(400).json({ error: "review_id is required" });
      return;
    }

    const review = await storage.getReviewById(review_id);
    if (!review || review.userId !== userId) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    let WB_API_KEY: string | null = null;
    if (review.cabinetId) {
      const cabinet = await storage.getCabinetById(review.cabinetId);
      WB_API_KEY = cabinet?.wbApiKey || null;
    }
    if (!WB_API_KEY) {
      const userSettings = await storage.getSettings(userId);
      WB_API_KEY = userSettings?.wbApiKey || null;
    }
    if (!WB_API_KEY) {
      res.status(400).json({ error: "WB API ключ не настроен. Добавьте его в настройках." });
      return;
    }

    const textToSend = answer_text || review.aiDraft;
    if (!textToSend) {
      res.status(400).json({ error: "No answer text provided" });
      return;
    }

    const resp = await fetch(`${WB_FEEDBACKS_URL}/api/v1/feedbacks/answer`, {
      method: "POST",
      headers: { Authorization: WB_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: review.wbId, text: textToSend }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`WB API error ${resp.status}: ${body}`);
    }

    const isEdited = !!review.sentAnswer;
    await storage.updateReview(review_id, {
      status: "sent",
      sentAnswer: textToSend,
      isEdited,
      updatedAt: new Date(),
    });

    await storage.updateTokenBalance(userId, currentBalance - 1);

    await storage.insertTokenTransaction({
      userId,
      amount: -1,
      type: "usage",
      description: "Отправка ответа на отзыв",
      reviewId: review_id,
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("send-reply error:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function generateReply(req: Request, res: Response) {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      res.status(503).json({ error: "OPENROUTER_API_KEY не настроен" });
      return;
    }

    const userId = (req as any).userId;
    const { review_id } = req.body;
    if (!review_id) {
      res.status(400).json({ error: "review_id is required" });
      return;
    }

    const review = await storage.getReviewById(review_id);
    if (!review || review.userId !== userId) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    let promptTemplate = "Ты — менеджер бренда на Wildberries. Напиши вежливый ответ на отзыв покупателя. 2-4 предложения.";
    let cabinetBrand = "";

    if (review.cabinetId) {
      const cabinet = await storage.getCabinetById(review.cabinetId);
      if (cabinet) {
        promptTemplate = cabinet.aiPromptTemplate || promptTemplate;
        cabinetBrand = cabinet.brandName || "";
      }
    } else {
      const userSettings = await storage.getSettings(userId);
      if (userSettings) {
        promptTemplate = userSettings.aiPromptTemplate || promptTemplate;
        cabinetBrand = userSettings.brandName || "";
      }
    }

    let recommendationInstruction = "";
    if (review.productArticle && review.cabinetId) {
      const recommendations = await storage.getRecommendationsByArticle(review.productArticle, review.cabinetId);
      if (recommendations && recommendations.length > 0 && review.rating >= 4) {
        const recList = recommendations
          .map((r) => `- Артикул ${r.targetArticle}${r.targetName ? `: "${r.targetName}"` : ""}`)
          .join("\n");
        recommendationInstruction = `\n\nРЕКОМЕНДАЦИИ: В конце ответа ненавязчиво предложи покупателю обратить внимание на другие наши товары:\n${recList}\nУпомяни артикулы, чтобы покупатель мог их найти на WB.`;
      }
    }

    const isEmptyReview = !review.text && !review.pros && !review.cons;
    let emptyInstruction = "";
    if (isEmptyReview) {
      emptyInstruction = review.rating >= 4
        ? `\n\n[Это пустой отзыв без текста. Покупатель поставил только оценку ${review.rating} из 5.\nНапиши КОРОТКУЮ благодарность за отзыв и высокую оценку. Максимум 1-2 предложения.]`
        : `\n\n[Это пустой отзыв без текста. Покупатель поставил низкую оценку ${review.rating} из 5 без пояснения.\nВырази сожаление. Предложи написать в чат с продавцом.\nМаксимум 1-2 предложения.]`;
    }

    const photoLinks = Array.isArray(review.photoLinks) ? review.photoLinks : [];
    const photoCount = photoLinks.length;
    const hasVideo = review.hasVideo === true;
    let attachmentInfo = "";
    if (photoCount > 0 || hasVideo) {
      const parts: string[] = [];
      if (photoCount > 0) {
        const photoWord = photoCount === 1 ? "фотографию" : photoCount < 5 ? "фотографии" : "фотографий";
        parts.push(`${photoCount} ${photoWord}`);
      }
      if (hasVideo) parts.push("видео");
      attachmentInfo = photoCount > 0
        ? `\n\n[Покупатель приложил ${parts.join(" и ")} к отзыву. Фотографии прикреплены ниже — проанализируй их и учти в ответе, если это уместно.]`
        : `\n\n[Покупатель приложил ${parts.join(" и ")} к отзыву.]`;
    }

    let reviewContent = "";
    const contentParts: string[] = [];
    if (review.text) contentParts.push(`Комментарий: ${review.text}`);
    if (review.pros) contentParts.push(`Плюсы: ${review.pros}`);
    if (review.cons) contentParts.push(`Недостатки: ${review.cons}`);
    reviewContent = contentParts.length > 0 ? contentParts.join("\n\n") : "(Без текста, только оценка)";

    const authorName = review.authorName || "";
    const nameInstruction = authorName && authorName !== "Покупатель"
      ? `\n\nИмя покупателя: ${authorName}. Обратись к покупателю по имени в ответе.`
      : "";

    const isRefusal = detectRefusal(review.text, review.pros, review.cons);
    const refusalWarning = isRefusal
      ? `\n\n[ВНИМАНИЕ: Покупатель НЕ выкупил товар. НЕ благодари за покупку. Поблагодари за внимание к бренду, вырази сожаление и пригласи вернуться.]`
      : "";

    const brandName = review.brandName || cabinetBrand || "";
    const brandInstruction = brandName
      ? `\n\nНазвание бренда продавца: ${brandName}. Используй это название при обращении к покупателю.`
      : "";

    const userMessage = `ВАЖНО: строго следуй всем правилам из системного промпта.${refusalWarning}${brandInstruction}\n\nОтзыв (${review.rating} из 5 звёзд) на товар "${review.productName}":\n\n${reviewContent}${attachmentInfo}${nameInstruction}${recommendationInstruction}${emptyInstruction}`;

    const model = photoCount > 0
      ? "google/gemini-2.5-flash"
      : review.rating >= 4
        ? "google/gemini-2.5-flash-lite"
        : "openai/gpt-5.2";

    const userContent: any = photoCount > 0
      ? [
          { type: "text", text: userMessage },
          ...photoLinks.slice(0, 5).map((photo: any) => ({
            type: "image_url",
            image_url: { url: photo.miniSize || photo.fullSize },
          })).filter((p: any) => p.image_url.url),
        ]
      : userMessage;

    const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: promptTemplate },
          { role: "user", content: userContent },
        ],
        max_tokens: isEmptyReview ? 300 : 1000,
        temperature: 0.7,
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      throw new Error(`AI gateway error ${aiResp.status}: ${text}`);
    }

    const aiData = await aiResp.json();
    const newDraft = aiData.choices?.[0]?.message?.content || "";

    if (!newDraft) throw new Error("AI returned empty response");

    await storage.updateReview(review_id, { aiDraft: newDraft, status: "pending" });

    res.json({ success: true, draft: newDraft });
  } catch (e: any) {
    console.error("generate-reply error:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function validateApiKey(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { api_key, cabinet_id } = req.body;

    if (!api_key || typeof api_key !== "string" || api_key.trim().length < 10) {
      res.json({ valid: false, error: "Некорректный API-ключ" });
      return;
    }
    if (!cabinet_id) {
      res.status(400).json({ valid: false, error: "cabinet_id is required" });
      return;
    }

    const trimmedKey = api_key.trim();

    const testResp = await fetch(
      `${WB_FEEDBACKS_URL}/api/v1/feedbacks?isAnswered=false&take=1&skip=0`,
      { headers: { Authorization: trimmedKey } }
    );

    if (!testResp.ok) {
      await testResp.text();
      res.json({
        valid: false,
        error: testResp.status === 401 ? "Неверный API-ключ" : `Ошибка WB API: ${testResp.status}`,
      });
      return;
    }
    await testResp.text();

    await storage.updateCabinet(cabinet_id, { wbApiKey: trimmedKey });

    const userSettings = await storage.getSettings(userId);
    if (userSettings) {
      await storage.updateSettings(userSettings.id, { wbApiKey: trimmedKey });
    }

    let chatAccess = false;
    try {
      const chatResp = await fetch(`${WB_CHAT_BASE}/api/v1/seller/chats`, {
        headers: { Authorization: trimmedKey },
      });
      await chatResp.text();
      chatAccess = chatResp.ok;
    } catch { }

    const masked = trimmedKey.length > 8
      ? trimmedKey.slice(0, 4) + "****...****" + trimmedKey.slice(-4)
      : "****";

    let archiveImported = false;
    try {
      const reviewCount = await storage.getReviewCountByCabinet(cabinet_id);
      if (reviewCount === 0) {
        console.log(`First setup detected for cabinet ${cabinet_id} — triggering archive import`);
        fetchArchiveInternal(userId, cabinet_id, trimmedKey).catch(err =>
          console.error("Archive auto-import failed:", err)
        );
        archiveImported = true;
      }
    } catch (archiveErr) {
      console.error("Archive auto-import check failed:", archiveErr);
    }

    res.json({ valid: true, masked_key: masked, chat_access: chatAccess, archive_imported: archiveImported });
  } catch (e: any) {
    console.error("validate-api-key error:", e);
    res.status(500).json({ valid: false, error: e.message });
  }
}

export async function sendChatMessage(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { chat_id, message } = req.body;

    if (!chat_id) { res.status(400).json({ error: "chat_id is required" }); return; }
    if (!message || !message.trim()) { res.status(400).json({ error: "message is required" }); return; }
    if (message.length > 1000) { res.status(400).json({ error: "Сообщение не должно превышать 1000 символов" }); return; }

    const chat = await storage.getChatByWbId(chat_id, userId);
    if (!chat) { res.status(404).json({ error: "Чат не найден" }); return; }
    if (!chat.replySign) { res.status(400).json({ error: "Нет подписи для ответа (reply_sign). Синхронизируйте чаты." }); return; }

    let WB_API_KEY: string | null = null;
    if (chat.cabinetId) {
      const cabinet = await storage.getCabinetById(chat.cabinetId);
      WB_API_KEY = cabinet?.wbApiKey || null;
    }
    if (!WB_API_KEY) {
      const userSettings = await storage.getSettings(userId);
      WB_API_KEY = userSettings?.wbApiKey || null;
    }
    if (!WB_API_KEY) {
      res.status(400).json({ error: "WB API ключ не настроен. Добавьте его в настройках." });
      return;
    }

    const formData = new FormData();
    formData.append("replySign", chat.replySign);
    formData.append("message", message.trim());

    const resp = await fetch(`${WB_CHAT_BASE}/api/v1/seller/message`, {
      method: "POST",
      headers: { Authorization: WB_API_KEY },
      body: formData,
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`WB Chat API error ${resp.status}: ${body}`);
    }

    const eventId = `seller_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      await storage.upsertChatMessage({
        chatId: chat_id,
        userId,
        cabinetId: chat.cabinetId || null,
        eventId,
        sender: "seller",
        text: message.trim(),
        attachments: [],
        sentAt: new Date(),
      });
    } catch (e: any) {
      console.error("Failed to save sent message:", e);
    }

    await storage.updateChat(chat_id, userId, {
      lastMessageText: message.trim(),
      lastMessageAt: new Date(),
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("send-chat-message error:", e);
    res.status(500).json({ error: e.message });
  }
}

function formatReviewsForAI(reviews: any[]): string {
  return reviews
    .map((r: any, i: number) => {
      const parts = [`${i + 1}. ${r.rating}/5 — ${r.authorName} (${r.createdDate})`];
      if (r.pros) parts.push(`   Плюсы: "${r.pros}"`);
      if (r.cons) parts.push(`   Минусы: "${r.cons}"`);
      if (r.text) parts.push(`   Комментарий: "${r.text}"`);
      parts.push(`   Товар: ${r.productName} (${r.productArticle})`);
      return parts.join("\n");
    })
    .join("\n\n");
}

function detectIntent(message: string): { articles: string[]; wantsNegative: boolean; wantsPositive: boolean } {
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
  return {
    articles,
    wantsNegative: negativeKeywords.some((kw) => lower.includes(kw)),
    wantsPositive: positiveKeywords.some((kw) => lower.includes(kw)),
  };
}

async function getTimeStats(userId: string): Promise<string> {
  const allData = await storage.getReviewTimeStats(userId);
  if (allData.length === 0) return "";

  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const byDay: Record<string, { total: number; neg: number; sumRating: number }> = {};
  const byHour: Record<number, { total: number; neg: number; sumRating: number }> = {};

  for (const name of dayNames) byDay[name] = { total: 0, neg: 0, sumRating: 0 };
  for (let h = 0; h < 24; h++) byHour[h] = { total: 0, neg: 0, sumRating: 0 };

  for (const r of allData) {
    if (!r.createdDate) continue;
    const d = new Date(r.createdDate);
    const dayName = dayNames[d.getUTCDay()];
    const hour = d.getUTCHours();

    byDay[dayName].total++;
    byDay[dayName].sumRating += r.rating;
    if (r.rating <= 3) byDay[dayName].neg++;

    byHour[hour].total++;
    byHour[hour].sumRating += r.rating;
    if (r.rating <= 3) byHour[hour].neg++;
  }

  const lines: string[] = [];
  lines.push(`Статистика по дням недели (всего ${allData.length} отзывов):`);
  for (const name of ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]) {
    const d = byDay[name];
    if (d.total === 0) continue;
    const avg = Math.round((d.sumRating / d.total) * 100) / 100;
    lines.push(`  ${name}: ${d.total} отзывов, ср. рейтинг ${avg}, негативных: ${d.neg}`);
  }
  lines.push("");
  lines.push("Статистика по часам (UTC):");
  for (let h = 0; h < 24; h++) {
    const hr = byHour[h];
    if (hr.total === 0) continue;
    const avg = Math.round((hr.sumRating / hr.total) * 100) / 100;
    lines.push(`  ${String(h).padStart(2, "0")}:00-${String(h).padStart(2, "0")}:59: ${hr.total} отзывов, ср. рейтинг ${avg}, негативных: ${hr.neg}`);
  }

  return lines.join("\n");
}

export async function aiAssistant(req: Request, res: Response) {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      res.status(503).json({ error: "OPENROUTER_API_KEY не настроен" });
      return;
    }

    const userId = (req as any).userId;
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const aiBalance = await storage.getAiRequestBalance(userId);
    if (aiBalance < 1) {
      res.status(402).json({ error: "У вас закончились запросы AI аналитика. Приобретите пакет запросов." });
      return;
    }

    await storage.updateAiRequestBalance(userId, aiBalance - 1);
    await storage.insertAiRequestTransaction({
      userId, amount: -1, type: "usage",
      description: "Запрос к AI аналитику",
    });

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
    const userText = lastUserMessage?.content || "";
    const { articles, wantsNegative, wantsPositive } = detectIntent(userText);

    const allReviews = await storage.getReviewsByUserId(userId);

    interface ProductStats {
      productArticle: string;
      productName: string;
      count: number;
      avgRating: number;
      ratings: Record<number, number>;
    }
    const statsMap = new Map<string, ProductStats>();
    for (const r of allReviews) {
      let s = statsMap.get(r.productArticle);
      if (!s) {
        s = { productArticle: r.productArticle, productName: r.productName, count: 0, avgRating: 0, ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
        statsMap.set(r.productArticle, s);
      }
      s.count++;
      s.ratings[r.rating] = (s.ratings[r.rating] || 0) + 1;
    }
    for (const s of statsMap.values()) {
      const total = Object.entries(s.ratings).reduce((sum, [star, cnt]) => sum + Number(star) * cnt, 0);
      s.avgRating = Math.round((total / s.count) * 100) / 100;
    }

    const productStats = Array.from(statsMap.values());
    const statsBlock = productStats
      .map((s) => `- Артикул ${s.productArticle}: "${s.productName}" — ${s.count} отзывов, средний рейтинг ${s.avgRating} (1: ${s.ratings[1]}, 2: ${s.ratings[2]}, 3: ${s.ratings[3]}, 4: ${s.ratings[4]}, 5: ${s.ratings[5]})`)
      .join("\n");

    const timeStatsText = await getTimeStats(userId);

    const contextParts: string[] = [
      `Товары в базе (всего ${productStats.reduce((s, p) => s + p.count, 0)} отзывов):\n${statsBlock}`,
    ];

    if (timeStatsText) contextParts.push(`\n${timeStatsText}`);

    for (const article of articles) {
      const data = await storage.getReviewsByUserIdAndArticle(userId, article, 50);
      if (data && data.length > 0) {
        contextParts.push(`\nОтзывы по артикулу ${article} (последние ${data.length}):\n${formatReviewsForAI(data)}`);
      } else {
        contextParts.push(`\nАртикул ${article} не найден в базе.`);
      }
    }

    if (wantsNegative && articles.length === 0) {
      const data = await storage.getNegativeReviewsByUserId(userId, 50);
      if (data && data.length > 0) {
        contextParts.push(`\nОтзывы с низким рейтингом (1-3 звезды, последние ${data.length}):\n${formatReviewsForAI(data)}`);
      }
    }

    if (wantsPositive && articles.length === 0) {
      const data = await storage.getPositiveReviewsByUserId(userId, 50);
      if (data && data.length > 0) {
        contextParts.push(`\nПоложительные отзывы (4-5 звёзд, последние ${data.length}):\n${formatReviewsForAI(data)}`);
      }
    }

    const systemPrompt = `Ты — AI-аналитик по отзывам маркетплейса Wildberries. У тебя есть полный доступ к базе отзывов покупателей.

Твои возможности:
- Анализировать отзывы по конкретным товарам (по артикулу)
- Выявлять основные жалобы и преимущества товаров
- Давать статистику по рейтингам
- Находить паттерны в отзывах
- Анализировать динамику отзывов по дням недели и времени суток
- Выявлять временные паттерны (когда приходит больше негатива, сезонность и т.д.)
- Отвечать на любые вопросы о товарах и мнении покупателей

Правила:
- Отвечай структурированно, используй списки и заголовки
- Приводи конкретные цитаты из отзывов когда это уместно
- Указывай артикулы товаров в ответах
- Если спрашивают о товаре которого нет в базе — скажи об этом
- Отвечай на русском языке
- Будь кратким но информативным
- Используй агрегированную статистику по дням недели и часам для анализа временных паттернов

Данные из базы отзывов:

${contextParts.join("\n")}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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
    });

    if (!response.ok) {
      if (response.status === 429) {
        res.status(429).json({ error: "Превышен лимит запросов. Попробуйте позже." });
        return;
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      res.status(500).json({ error: "Ошибка AI-сервиса" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body?.getReader();
    if (!reader) {
      res.status(500).json({ error: "No response body" });
      return;
    }

    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      res.end();
    }
  } catch (e: any) {
    console.error("ai-assistant error:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    }
  }
}

export async function createPayment(req: Request, res: Response) {
  try {
    const ROBOKASSA_LOGIN = process.env.ROBOKASSA_LOGIN;
    const ROBOKASSA_PASSWORD1 = process.env.ROBOKASSA_PASSWORD1;

    if (!ROBOKASSA_LOGIN || !ROBOKASSA_PASSWORD1) {
      res.status(503).json({ error: "Оплата пока не настроена. Ключи Робокассы не добавлены." });
      return;
    }

    const userId = (req as any).userId;
    const { amount, tokens } = req.body;

    if (!amount || !tokens) {
      res.status(400).json({ error: "amount and tokens are required" });
      return;
    }

    const payment = await storage.createPayment({
      userId,
      amount: String(amount),
      tokens,
      status: "pending",
    });

    const outSum = Number(amount).toFixed(2);
    const invId = payment.invId;

    const signatureString = `${ROBOKASSA_LOGIN}:${outSum}:${invId}:${ROBOKASSA_PASSWORD1}`;
    const signature = md5(signatureString);

    const robokassaUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${ROBOKASSA_LOGIN}&OutSum=${outSum}&InvId=${invId}&SignatureValue=${signature}&IsTest=1`;

    console.log(`[create-payment] Created payment inv_id=${invId} for user=${userId}, amount=${outSum}, tokens=${tokens}`);

    res.json({ url: robokassaUrl, inv_id: invId });
  } catch (e: any) {
    console.error("create-payment error:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function robokassaWebhook(req: Request, res: Response) {
  try {
    const ROBOKASSA_PASSWORD2 = process.env.ROBOKASSA_PASSWORD2;
    if (!ROBOKASSA_PASSWORD2) {
      res.status(503).send("Configuration error");
      return;
    }

    let outSum: string | undefined;
    let invId: string | undefined;
    let signatureValue: string | undefined;

    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      outSum = req.body.OutSum;
      invId = req.body.InvId;
      signatureValue = req.body.SignatureValue;
    } else if (contentType.includes("application/json")) {
      outSum = req.body.OutSum;
      invId = req.body.InvId;
      signatureValue = req.body.SignatureValue;
    } else {
      outSum = req.query.OutSum as string;
      invId = req.query.InvId as string;
      signatureValue = req.query.SignatureValue as string;
    }

    if (!outSum || !invId || !signatureValue) {
      res.status(400).send("bad request");
      return;
    }

    const expectedSignature = md5(`${outSum}:${invId}:${ROBOKASSA_PASSWORD2}`);
    if (signatureValue.toLowerCase() !== expectedSignature.toLowerCase()) {
      console.error(`[robokassa-webhook] Invalid signature for InvId=${invId}`);
      res.status(400).send("bad sign");
      return;
    }

    const payment = await storage.getPaymentByInvId(Number(invId));
    if (!payment) {
      res.status(404).send("payment not found");
      return;
    }

    if (payment.status === "completed") {
      res.status(200).send(`OK${invId}`);
      return;
    }

    await storage.updatePaymentStatus(payment.id, "completed");

    const existingBalance = await storage.getTokenBalance(payment.userId);
    await storage.upsertTokenBalance(payment.userId, existingBalance + payment.tokens);

    await storage.insertTokenTransaction({
      userId: payment.userId,
      amount: payment.tokens,
      type: "purchase",
      description: `Покупка ${payment.tokens} токенов (${outSum} руб)`,
    });

    console.log(`[robokassa-webhook] Payment InvId=${invId} completed. Added ${payment.tokens} tokens to user ${payment.userId}`);

    res.status(200).send(`OK${invId}`);
  } catch (e: any) {
    console.error("robokassa-webhook error:", e);
    res.status(500).send("internal error");
  }
}

async function fetchArchiveInternal(userId: string, cabinetId: string, wbApiKey: string) {
  console.log(`[fetch-archive] Starting archive import for cabinet=${cabinetId} user=${userId}`);

  const allFeedbacks: any[] = [];
  let skip = 0;
  const take = 50;
  const maxPages = 20;
  let pagesProcessed = 0;

  while (pagesProcessed < maxPages) {
    const wbData = await fetchWBArchiveReviews(wbApiKey, skip, take);
    const feedbacks = wbData?.data?.feedbacks || [];
    if (feedbacks.length === 0) break;
    allFeedbacks.push(...feedbacks);
    if (feedbacks.length < take) break;
    skip += take;
    pagesProcessed++;
    await delay(350);
  }

  console.log(`[fetch-archive] Fetched ${allFeedbacks.length} archive reviews`);

  let importedCount = 0;
  for (const fb of allFeedbacks) {
    const wbId = fb.id;
    const existing = await storage.getReviewByWbId(wbId, userId, cabinetId);
    if (existing) continue;

    const photoLinks = fb.photoLinks || [];
    const hasVideo = !!(fb.video && (fb.video.link || fb.video.previewImage));
    const reviewBrandName = fb.productDetails?.brandName || "";
    const answer = fb.answer?.text || null;

    await storage.insertReview({
      wbId,
      userId,
      cabinetId,
      rating: fb.productValuation || 5,
      authorName: fb.userName || "Покупатель",
      text: fb.text || null,
      pros: fb.pros || null,
      cons: fb.cons || null,
      productName: fb.productDetails?.productName || fb.subjectName || "Товар",
      productArticle: String(fb.productDetails?.nmId || fb.nmId || ""),
      brandName: reviewBrandName,
      photoLinks,
      hasVideo,
      status: answer ? "sent" : "new",
      aiDraft: null,
      sentAnswer: answer,
    });

    importedCount++;
  }

  console.log(`[fetch-archive] Imported ${importedCount} archive reviews for cabinet=${cabinetId}`);
  return { imported: importedCount, total: allFeedbacks.length };
}

export async function fetchArchive(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { cabinet_id } = req.body;

    if (!cabinet_id) {
      res.status(400).json({ error: "cabinet_id is required" });
      return;
    }

    const cabinet = await storage.getCabinetById(cabinet_id);
    if (!cabinet || cabinet.userId !== userId) {
      res.status(404).json({ error: "Cabinet not found" });
      return;
    }
    if (!cabinet.wbApiKey) {
      res.status(400).json({ error: "WB API ключ не настроен для этого кабинета." });
      return;
    }

    const result = await fetchArchiveInternal(userId, cabinet_id, cabinet.wbApiKey);
    res.json({ success: true, ...result });
  } catch (e: any) {
    console.error("fetch-archive error:", e);
    res.status(500).json({ error: e.message });
  }
}

let autoSyncRunning = false;

export async function runAutoSync() {
  if (autoSyncRunning) {
    console.log("[auto-sync] Skipping — previous sync still in progress");
    return;
  }
  autoSyncRunning = true;
  try {
    await runAutoSyncInternal();
  } finally {
    autoSyncRunning = false;
  }
}

async function runAutoSyncInternal() {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const allCabinets = await storage.getAllCabinetsWithApiKey();
  if (!allCabinets || allCabinets.length === 0) return;

  console.log(`[auto-sync] Processing ${allCabinets.length} cabinets`);

  for (const cabinet of allCabinets) {
    try {
      if (OPENROUTER_API_KEY) {
        const reviewResult = await processCabinetReviews(cabinet, OPENROUTER_API_KEY);
        console.log(`[auto-sync] Reviews for cabinet=${cabinet.id}: new=${reviewResult.new_reviews}, auto=${reviewResult.auto_sent}`);
      }
    } catch (e: any) {
      console.error(`[auto-sync] Review sync failed for cabinet=${cabinet.id}:`, e.message);
    }

    try {
      const chatResult = await processCabinetChats(cabinet);
      console.log(`[auto-sync] Chats for cabinet=${cabinet.id}: chats=${chatResult.chats}, messages=${chatResult.messages}`);
    } catch (e: any) {
      console.error(`[auto-sync] Chat sync failed for cabinet=${cabinet.id}:`, e.message);
    }

    await delay(2000);
  }

  console.log(`[auto-sync] Completed`);
}
