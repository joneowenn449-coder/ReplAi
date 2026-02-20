import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";

let bot: TelegramBot | null = null;

const APP_DOMAIN = "https://58f5cc99-55a6-439f-8709-d2675af5ea53-00-29unzgn58b4yj.picard.replit.dev";
const WB_FEEDBACKS_URL = "https://feedbacks-api.wildberries.ru";

const pendingEdits = new Map<string, string>();

export function getTelegramBot(): TelegramBot | null {
  return bot;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

function ratingStars(rating: number): string {
  const filled = Math.min(Math.max(rating, 0), 5);
  return "\u2B50".repeat(filled) + "\u2606".repeat(5 - filled);
}

function ratingEmoji(rating: number): string {
  if (rating <= 2) return "\uD83D\uDD34";
  if (rating === 3) return "\uD83D\uDFE1";
  return "\uD83D\uDFE2";
}

export function shouldNotify(cabinet: any, rating: number, reviewText: string | null): boolean {
  const notifyType = cabinet.tgNotifyType || "all";
  switch (notifyType) {
    case "all": return true;
    case "negative": return rating <= 3;
    case "questions": return (reviewText || "").includes("?");
    default: return true;
  }
}

function formatReplyModes(replyModes: Record<string, string> | null): string {
  const modes = replyModes && Object.keys(replyModes).length > 0
    ? replyModes
    : { "1": "manual", "2": "manual", "3": "manual", "4": "auto", "5": "auto" };

  const modeLabel = (m: string) => m === "auto" ? "Авто" : "Ручной";

  const high = modes["4"] || modes["5"] || "auto";
  const low = modes["1"] || modes["2"] || modes["3"] || "manual";

  return `⭐⭐⭐⭐-⭐⭐⭐⭐⭐ → ${modeLabel(high)}\n⭐-⭐⭐⭐ → ${modeLabel(low)}`;
}

async function sendSettingsMenu(chatId: string, cabinetId: string, messageId?: number) {
  try {
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet || !bot) return;

    const notifyType = cabinet.tgNotifyType || "all";
    const checkN = (type: string) => notifyType === type ? "\u2705 " : "";

    const modesInfo = formatReplyModes(cabinet.replyModes as Record<string, string> | null);

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [{ text: "\uD83D\uDD14 \u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F:", callback_data: "noop" }],
      [
        { text: `${checkN("all")}\u0412\u0441\u0435`, callback_data: `notify_all_${cabinetId}` },
        { text: `${checkN("negative")}\u041D\u0435\u0433\u0430\u0442\u0438\u0432`, callback_data: `notify_neg_${cabinetId}` },
        { text: `${checkN("questions")}\u0412\u043E\u043F\u0440\u043E\u0441\u044B`, callback_data: `notify_questions_${cabinetId}` },
      ],
      [{ text: "\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0440\u0435\u0436\u0438\u043C \u043E\u0442\u0432\u0435\u0442\u043E\u0432", callback_data: `rmcfg_start_${cabinetId}` }],
      [{ text: "\u2705 \u0413\u043E\u0442\u043E\u0432\u043E", callback_data: `settings_done_${cabinetId}` }],
    ];

    const text = `\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430:\n\n\uD83D\uDCDD \u0420\u0435\u0436\u0438\u043C \u043E\u0442\u0432\u0435\u0442\u043E\u0432:\n${modesInfo}`;

    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: keyboard },
      });
    } else {
      await bot.sendMessage(chatId, text, {
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } catch (err) {
    console.error("[telegram] Error sending settings menu:", err);
  }
}

async function sendReplyModeStep(chatId: string, cabinetId: string, step: "high" | "low", messageId: number) {
  try {
    if (!bot) return;
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet) return;

    const modes = (cabinet.replyModes as Record<string, string>) || {};
    const currentHigh = modes["4"] || modes["5"] || "auto";
    const currentLow = modes["1"] || modes["2"] || modes["3"] || "manual";

    if (step === "high") {
      const checkH = (m: string) => currentHigh === m ? "\u2705 " : "";
      const text = "\u2B50\u2B50\u2B50\u2B50-\u2B50\u2B50\u2B50\u2B50\u2B50 \u0420\u0435\u0436\u0438\u043C \u0434\u043B\u044F 4-5 \u0437\u0432\u0451\u0437\u0434:";
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: `${checkH("manual")}\u0420\u0443\u0447\u043D\u043E\u0439`, callback_data: `rmset_high_manual_${cabinetId}` },
          { text: `${checkH("auto")}\u0410\u0432\u0442\u043E`, callback_data: `rmset_high_auto_${cabinetId}` },
        ],
      ];
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } });
    } else {
      const checkL = (m: string) => currentLow === m ? "\u2705 " : "";
      const text = "\u2B50-\u2B50\u2B50\u2B50 \u0420\u0435\u0436\u0438\u043C \u0434\u043B\u044F 1-3 \u0437\u0432\u0451\u0437\u0434:";
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: `${checkL("manual")}\u0420\u0443\u0447\u043D\u043E\u0439`, callback_data: `rmset_low_manual_${cabinetId}` },
          { text: `${checkL("auto")}\u0410\u0432\u0442\u043E`, callback_data: `rmset_low_auto_${cabinetId}` },
        ],
      ];
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } });
    }
  } catch (err) {
    console.error("[telegram] Error sending reply mode step:", err);
  }
}

export async function sendNewReviewNotification(
  cabinetId: string,
  reviewId: string,
  reviewData: {
    userName: string;
    rating: number;
    text: string;
    pros: string | null;
    cons: string | null;
    productName: string;
    productArticle: string;
    photoLinks: any[] | null;
    aiInsight: string | null;
  }
) {
  if (!bot) return;
  try {
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet?.telegramChatId) return;

    if (!shouldNotify(cabinet, reviewData.rating, reviewData.text)) return;

    const emoji = ratingEmoji(reviewData.rating);
    const stars = ratingStars(reviewData.rating);

    let msg = `${emoji} *\u041D\u041E\u0412\u042B\u0419 \u041E\u0422\u0417\u042B\u0412* (${reviewData.rating}/5) | \u0410\u0440\u0442\u0438\u043A\u0443\u043B: ${escapeMarkdown(reviewData.productArticle)}\n\n`;
    msg += `\uD83D\uDCE6 ${escapeMarkdown(reviewData.productName)}\n`;
    msg += `\u041E\u0442: ${escapeMarkdown(reviewData.userName)}\n`;

    if (reviewData.text) {
      msg += `\n\uD83D\uDCAC \u0422\u0435\u043A\u0441\u0442: \u00AB${escapeMarkdown(truncate(reviewData.text, 300))}\u00BB\n`;
    }

    if (reviewData.pros) {
      msg += `\n\uD83D\uDC4D \u0414\u043E\u0441\u0442\u043E\u0438\u043D\u0441\u0442\u0432\u0430: ${escapeMarkdown(truncate(reviewData.pros, 200))}`;
    }
    if (reviewData.cons) {
      msg += `\n\uD83D\uDC4E \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043A\u0438: ${escapeMarkdown(truncate(reviewData.cons, 200))}`;
    }

    if (reviewData.aiInsight) {
      msg += `\n\n\uD83E\uDD16 \u0418\u043D\u0441\u0430\u0439\u0442 AI: \u00AB${escapeMarkdown(truncate(reviewData.aiInsight, 200))}\u00BB`;
    }

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: "\uD83E\uDD16 \u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043E\u0442\u0432\u0435\u0442", callback_data: `gen_${reviewId}` },
      ],
      [
        { text: "\uD83D\uDCAC \u0427\u0430\u0442 \u0441 \u043F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u0435\u043C", url: `${APP_DOMAIN}/chats` },
      ],
    ];

    const photos = Array.isArray(reviewData.photoLinks) ? reviewData.photoLinks : [];
    const firstPhotoUrl = photos.length > 0
      ? (typeof photos[0] === "string" ? photos[0] : (photos[0]?.miniSize || photos[0]?.fullSize || null))
      : null;

    if (firstPhotoUrl) {
      await bot.sendPhoto(cabinet.telegramChatId, firstPhotoUrl, {
        caption: msg,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    } else {
      await bot.sendMessage(cabinet.telegramChatId, msg, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } catch (err) {
    console.error("[telegram] Error sending new review notification:", err);
  }
}

export async function sendAutoReplyNotification(
  cabinetId: string,
  review: { userName: string; rating: number; text: string; productName: string; productArticle?: string },
  answer: string
) {
  if (!bot) return;
  try {
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet?.telegramChatId) return;

    if (!shouldNotify(cabinet, review.rating, review.text)) return;

    const emoji = ratingEmoji(review.rating);
    const msg = `\u2705 *\u0410\u0432\u0442\u043E\\-\u043E\u0442\u0432\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D*\n\n` +
      `${emoji} (${review.rating}/5) | \u0410\u0440\u0442: ${escapeMarkdown(review.productArticle || "")}\n` +
      `\uD83D\uDCE6 ${escapeMarkdown(review.productName || "")}\n` +
      `\uD83D\uDCAC \u00AB${escapeMarkdown(truncate(review.text || "", 200))}\u00BB\n\n` +
      `\uD83D\uDCDD *\u041E\u0442\u0432\u0435\u0442:* ${escapeMarkdown(truncate(answer, 500))}`;
    await bot.sendMessage(cabinet.telegramChatId, msg, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("[telegram] Error sending auto-reply notification:", err);
  }
}

const adminErrorThrottle = new Map<string, number>();
const ADMIN_ERROR_THROTTLE_MS = 30 * 60 * 1000;

export async function sendAdminAIErrorNotification(errorCount: number, cabinetName: string, errors: string[]) {
  if (!bot) return;

  const now = Date.now();
  const lastSent = adminErrorThrottle.get(cabinetName) || 0;
  if (now - lastSent < ADMIN_ERROR_THROTTLE_MS) {
    console.log(`[telegram] AI error notification throttled for cabinet=${cabinetName}`);
    return;
  }

  try {
    const adminRoles = await storage.getAllUserRoles();
    const adminUserIds = new Set(adminRoles.filter(r => r.role === "admin").map(r => r.userId));
    if (adminUserIds.size === 0) return;

    const allCabinets = await storage.getAllCabinetsWithApiKey();
    const notifiedChats = new Set<string>();
    for (const cab of allCabinets) {
      if (cab.telegramChatId && adminUserIds.has(cab.userId) && !notifiedChats.has(cab.telegramChatId)) {
        notifiedChats.add(cab.telegramChatId);
        const errorSample = errors.slice(0, 3).map(e => `• ${escapeMarkdown(truncate(e, 100))}`).join("\n");
        const msg = `⚠️ *Ошибки AI\\-генерации*\n\nКабинет: ${escapeMarkdown(cabinetName)}\nОшибок: ${errorCount}\n\n${errorSample}${errors.length > 3 ? `\n\\.\\.\\.и ещё ${errors.length - 3}` : ""}`;
        await bot.sendMessage(cab.telegramChatId, msg, { parse_mode: "MarkdownV2" });
      }
    }

    adminErrorThrottle.set(cabinetName, now);
  } catch (err) {
    console.error("[telegram] Error sending admin AI error notification:", err);
  }
}

function buildDraftMessage(review: any, draft: string): string {
  const emoji = ratingEmoji(review.rating || 0);
  let msg = `${emoji} *\u041E\u0442\u0437\u044B\u0432* (${review.rating || 0}/5) | \u0410\u0440\u0442: ${escapeMarkdown(review.productArticle || "")}\n`;
  msg += `\uD83D\uDCE6 ${escapeMarkdown(review.productName || "")}\n`;
  msg += `\u041E\u0442: ${escapeMarkdown(review.authorName || "\u041F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u044C")}\n`;
  if (review.text) {
    msg += `\uD83D\uDCAC \u00AB${escapeMarkdown(truncate(review.text, 200))}\u00BB\n`;
  }
  msg += `\n\uD83D\uDCDD *\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A AI:*\n${escapeMarkdown(truncate(draft, 500))}`;
  return msg;
}

function draftKeyboard(reviewId: string): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: "\u2705 \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C", callback_data: `pub_${reviewId}` },
      { text: "\u270F\uFE0F \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", callback_data: `edit_${reviewId}` },
    ],
    [
      { text: "\uD83D\uDD04 \u041F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C", callback_data: `regen_${reviewId}` },
    ],
  ];
}

export async function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN not set, skipping bot init");
    return;
  }

  if (bot) {
    try {
      await bot.stopPolling();
      console.log("[telegram] Stopped previous bot polling");
    } catch (e) {
    }
    bot = null;
  }

  bot = new TelegramBot(token, {
    polling: {
      autoStart: true,
      params: { timeout: 30 },
    },
  });

  bot.on("polling_error", (err: any) => {
    if (err?.code === "ETELEGRAM" && err?.response?.body?.error_code === 409) {
      console.warn("[telegram] Polling conflict (409) — another instance may be running, will retry...");
    } else {
      console.error("[telegram] Polling error:", err?.message || err);
    }
  });

  console.log("[telegram] Bot started with long polling");

  bot.setMyCommands([
    { command: "start", description: "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A / \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435" },
    { command: "shops", description: "\u041C\u043E\u0438 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u044B WB" },
    { command: "stats", description: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0437\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F" },
    { command: "balance", description: "\u0411\u0430\u043B\u0430\u043D\u0441 \u0442\u043E\u043A\u0435\u043D\u043E\u0432" },
    { command: "mode", description: "\u0420\u0435\u0436\u0438\u043C \u043E\u0442\u0432\u0435\u0442\u043E\u0432" },
    { command: "settings", description: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439" },
  ]).catch(err => console.error("[telegram] Error setting commands:", err));

  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = String(msg.chat.id);
    const payload = (match?.[1] || "").trim();

    if (!payload || !payload.startsWith("auth_")) {
      await bot!.sendMessage(chatId, "\u041F\u0440\u0438\u0432\u0435\u0442! \u0427\u0442\u043E\u0431\u044B \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0431\u043E\u0442\u0430, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u00AB\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C Telegram\u00BB \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435.");
      return;
    }

    const authToken = payload.replace("auth_", "");
    try {
      const result = await storage.validateAndConsumeTelegramAuthToken(authToken);
      if (!result) {
        await bot!.sendMessage(chatId, "\u274C \u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u0430 \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430.");
        return;
      }

      const telegramUsername = msg.from?.username || null;
      const telegramFirstName = msg.from?.first_name || null;
      await storage.updateCabinet(result.cabinetId, {
        telegramChatId: chatId,
        telegramUsername,
        telegramFirstName,
      } as any);

      const cabinet = await storage.getCabinetById(result.cabinetId);
      const cabinetName = cabinet?.name || "\u041A\u0430\u0431\u0438\u043D\u0435\u0442";

      await bot!.sendMessage(
        chatId,
        `\u2705 \u0423\u0441\u043F\u0435\u0448\u043D\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E!\n\n\u041A\u0430\u0431\u0438\u043D\u0435\u0442: ${cabinetName}\n\n\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E\u0431 \u043E\u0442\u0437\u044B\u0432\u0430\u0445.`
      );

      await sendSettingsMenu(chatId, result.cabinetId);
    } catch (err) {
      console.error("[telegram] Error handling /start:", err);
      await bot!.sendMessage(chatId, "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
    }
  });

  bot.onText(/\/settings/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const cabinet = await storage.getCabinetByTelegramChatId(chatId);
      if (!cabinet) {
        await bot!.sendMessage(chatId, "\u041A\u0430\u0431\u0438\u043D\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0431\u043E\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435.");
        return;
      }
      await sendSettingsMenu(chatId, cabinet.id);
    } catch (err) {
      console.error("[telegram] Error handling /settings:", err);
    }
  });

  bot.onText(/\/shops/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
      if (cabinets.length === 0) {
        await bot!.sendMessage(chatId, "\u041D\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0445 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u043E\u0432. \u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0431\u043E\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435.");
        return;
      }

      let msg_text = "\uD83C\uDFEA *\u041C\u043E\u0438 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u044B WB:*\n\n";
      for (const cab of cabinets) {
        const hasKey = !!cab.wbApiKey;
        const statusIcon = hasKey ? "\uD83D\uDFE2" : "\uD83D\uDD34";
        const statusText = hasKey ? "\u0410\u043A\u0442\u0438\u0432\u0435\u043D" : "\u041D\u0435\u0442 API-\u043A\u043B\u044E\u0447\u0430";
        const syncDate = cab.lastSyncAt ? new Date(cab.lastSyncAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "\u043D\u0435 \u0431\u044B\u043B\u043E";
        const modesInfo = formatReplyModes(cab.replyModes as Record<string, string> | null);

        msg_text += `${statusIcon} *${escapeMarkdown(cab.name || "\u041A\u0430\u0431\u0438\u043D\u0435\u0442")}*\n`;
        msg_text += `\u0421\u0442\u0430\u0442\u0443\u0441: ${statusText}\n`;
        msg_text += `\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F: ${syncDate}\n`;
        msg_text += `\u0420\u0435\u0436\u0438\u043C: ${modesInfo}\n\n`;
      }

      await bot!.sendMessage(chatId, msg_text, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("[telegram] Error handling /shops:", err);
      await bot!.sendMessage(chatId, "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u043F\u0438\u0441\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u043E\u0432.");
    }
  });

  bot.onText(/\/stats/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
      if (cabinets.length === 0) {
        await bot!.sendMessage(chatId, "\u041D\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0445 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u043E\u0432.");
        return;
      }

      const cabinetIds = cabinets.map(c => c.id);
      const stats = await storage.getTodayReviewStats(cabinetIds);

      const today = new Date().toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
      const pending = stats.total - stats.answered;
      const avgStr = stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "\u2014";

      let ratingBars = "";
      for (let r = 5; r >= 1; r--) {
        const cnt = stats.byRating[r] || 0;
        const bar = cnt > 0 ? "\u2588".repeat(Math.min(cnt, 20)) : "";
        ratingBars += `${"*".repeat(r)} ${bar} ${cnt}\n`;
      }

      const msg_text = `\uD83D\uDCCA *\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0437\u0430 ${today}*\n\n` +
        `\uD83D\uDCE5 \u041D\u043E\u0432\u044B\u0445 \u043E\u0442\u0437\u044B\u0432\u043E\u0432: *${stats.total}*\n` +
        `\u2705 \u041E\u0442\u0432\u0435\u0447\u0435\u043D\u043E: *${stats.answered}*\n` +
        `\u23F3 \u041E\u0436\u0438\u0434\u0430\u044E\u0442 \u043E\u0442\u0432\u0435\u0442\u0430: *${pending}*\n` +
        `\u2B50 \u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0440\u0435\u0439\u0442\u0438\u043D\u0433: *${avgStr}*\n\n` +
        `\uD83D\uDCCA \u0420\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435:\n${ratingBars}`;

      await bot!.sendMessage(chatId, msg_text, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("[telegram] Error handling /stats:", err);
      await bot!.sendMessage(chatId, "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438.");
    }
  });

  bot.onText(/\/balance/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const cabinet = await storage.getCabinetByTelegramChatId(chatId);
      if (!cabinet) {
        await bot!.sendMessage(chatId, "\u041A\u0430\u0431\u0438\u043D\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
        return;
      }

      const balance = await storage.getTokenBalance(cabinet.userId);

      const msg_text = `\uD83D\uDCB0 *\u0411\u0430\u043B\u0430\u043D\u0441 \u0442\u043E\u043A\u0435\u043D\u043E\u0432*\n\n` +
        `\u041E\u0441\u0442\u0430\u0442\u043E\u043A: *${balance}* \u0442\u043E\u043A\u0435\u043D\u043E\u0432\n\n` +
        `1 \u0442\u043E\u043A\u0435\u043D = 1 \u043E\u0442\u0432\u0435\u0442 \u043D\u0430 \u043E\u0442\u0437\u044B\u0432`;

      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [{ text: "\uD83D\uDCB3 \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C", url: `${APP_DOMAIN}/pricing` }],
      ];

      await bot!.sendMessage(chatId, msg_text, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (err) {
      console.error("[telegram] Error handling /balance:", err);
      await bot!.sendMessage(chatId, "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0431\u0430\u043B\u0430\u043D\u0441\u0430.");
    }
  });

  bot.onText(/\/mode/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const cabinet = await storage.getCabinetByTelegramChatId(chatId);
      if (!cabinet) {
        await bot!.sendMessage(chatId, "\u041A\u0430\u0431\u0438\u043D\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
        return;
      }

      const modesInfo = formatReplyModes(cabinet.replyModes as Record<string, string> | null);

      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [{ text: "\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C", callback_data: `rmcfg_start_${cabinet.id}` }],
      ];

      await bot!.sendMessage(chatId, `\uD83D\uDCDD *\u0420\u0435\u0436\u0438\u043C \u043E\u0442\u0432\u0435\u0442\u043E\u0432:*\n\n${modesInfo}`, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (err) {
      console.error("[telegram] Error handling /mode:", err);
      await bot!.sendMessage(chatId, "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0440\u0435\u0436\u0438\u043C\u043E\u0432.");
    }
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    const chatId = String(msg.chat.id);

    const reviewId = pendingEdits.get(chatId);
    if (!reviewId) return;

    try {
      pendingEdits.delete(chatId);
      const newText = msg.text;

      await storage.updateReview(reviewId, { aiDraft: newText, status: "pending" });
      const review = await storage.getReviewById(reviewId);
      if (!review) return;

      const draftMsg = buildDraftMessage(review, newText);
      await bot!.sendMessage(chatId, draftMsg, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
      });
    } catch (err) {
      console.error("[telegram] Error handling edit text:", err);
    }
  });

  bot.on("callback_query", async (query) => {
    if (!query.data || !query.message) return;
    const chatId = String(query.message.chat.id);
    const messageId = query.message.message_id;
    const isPhotoMessage = !!(query.message as any).photo;

    try {
      if (query.data === "noop") {
        await bot!.answerCallbackQuery(query.id);
        return;
      }

      if (query.data.startsWith("notify_")) {
        const parts = query.data.split("_");
        const typeKey = parts[1];
        const cabinetId = parts.slice(2).join("_");

        const typeMap: Record<string, string> = { all: "all", neg: "negative", questions: "questions" };
        const newType = typeMap[typeKey] || "all";

        await storage.updateCabinet(cabinetId, { tgNotifyType: newType } as any);
        await sendSettingsMenu(chatId, cabinetId, messageId);
        await bot!.answerCallbackQuery(query.id);
        return;
      }

      if (query.data.startsWith("rmcfg_start_")) {
        const cabinetId = query.data.replace("rmcfg_start_", "");
        await sendReplyModeStep(chatId, cabinetId, "high", messageId);
        await bot!.answerCallbackQuery(query.id);
        return;
      }

      if (query.data.startsWith("rmset_")) {
        const parts = query.data.split("_");
        const group = parts[1];
        const mode = parts[2];
        const cabinetId = parts.slice(3).join("_");

        const cabinet = await storage.getCabinetById(cabinetId);
        const currentModes = (cabinet?.replyModes as Record<string, string>) || {};

        if (group === "high") {
          currentModes["4"] = mode;
          currentModes["5"] = mode;
          await storage.updateCabinet(cabinetId, { replyModes: currentModes } as any);
          await sendReplyModeStep(chatId, cabinetId, "low", messageId);
          await bot!.answerCallbackQuery(query.id);
        } else if (group === "low") {
          currentModes["1"] = mode;
          currentModes["2"] = mode;
          currentModes["3"] = mode;
          await storage.updateCabinet(cabinetId, { replyModes: currentModes } as any);
          await sendSettingsMenu(chatId, cabinetId, messageId);
          await bot!.answerCallbackQuery(query.id, { text: "\u0420\u0435\u0436\u0438\u043C \u043E\u0442\u0432\u0435\u0442\u043E\u0432 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D!" });
        }
        return;
      }

      if (query.data.startsWith("settings_done_")) {
        await bot!.editMessageText("\u2705 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B!", {
          chat_id: chatId,
          message_id: messageId,
        });
        await bot!.answerCallbackQuery(query.id);
        return;
      }

      if (query.data.startsWith("gen_")) {
        const reviewId = query.data.replace("gen_", "");
        await bot!.answerCallbackQuery(query.id, { text: "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u043E\u0442\u0432\u0435\u0442\u0430..." });

        const review = await storage.getReviewById(reviewId);
        if (!review) return;

        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        const cabinet = cabinets.find(c => c.id === review.cabinetId) || cabinets[0];
        if (!cabinet) return;

        const { generateReplyForReview } = await import("./functions");
        const newDraft = await generateReplyForReview(review, cabinet);

        if (newDraft) {
          await storage.updateReview(reviewId, { aiDraft: newDraft, status: "pending" });
          const draftMsg = buildDraftMessage(review, newDraft);

          if (isPhotoMessage) {
            await bot!.editMessageCaption(draftMsg, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
            });
          } else {
            await bot!.editMessageText(draftMsg, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
            });
          }
        }
        return;
      }

      if (query.data.startsWith("pub_")) {
        const reviewId = query.data.replace("pub_", "");

        const review = await storage.getReviewById(reviewId);
        if (!review || !review.aiDraft) {
          await bot!.answerCallbackQuery(query.id, { text: "\u041E\u0442\u0437\u044B\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0438\u043B\u0438 \u043D\u0435\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430" });
          return;
        }

        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        const cabinet = cabinets.find(c => c.id === review.cabinetId) || cabinets[0];
        if (!cabinet?.wbApiKey) {
          await bot!.answerCallbackQuery(query.id, { text: "API \u043A\u043B\u044E\u0447 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D" });
          return;
        }

        const wbResponse = await fetch(`${WB_FEEDBACKS_URL}/api/v1/feedbacks/answer`, {
          method: "POST",
          headers: {
            Authorization: cabinet.wbApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: review.wbId, text: review.aiDraft }),
        });

        if (!wbResponse.ok) {
          const errorText = await wbResponse.text();
          console.error("[telegram] WB send error:", errorText);
          await bot!.answerCallbackQuery(query.id, { text: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0430 WB" });
          return;
        }

        await storage.updateReview(reviewId, {
          status: "sent",
          sentAnswer: review.aiDraft,
          isEdited: false,
          updatedAt: new Date(),
        });

        if (review.userId) {
          const balance = await storage.getTokenBalance(review.userId);
          if (balance > 0) {
            await storage.updateTokenBalance(review.userId, balance - 1);
            await storage.insertTokenTransaction({
              userId: review.userId,
              amount: -1,
              type: "usage",
              description: "\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u043E\u0442\u0437\u044B\u0432 (Telegram)",
            });
          }
        }

        const pubText = `\u2705 *\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E*\n\n${escapeMarkdown(truncate(review.aiDraft, 500))}`;
        if (isPhotoMessage) {
          await bot!.editMessageCaption(pubText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
          });
        } else {
          await bot!.editMessageText(pubText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
          });
        }
        await bot!.answerCallbackQuery(query.id, { text: "\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E!" });
        return;
      }

      if (query.data.startsWith("edit_")) {
        const reviewId = query.data.replace("edit_", "");
        pendingEdits.set(chatId, reviewId);
        await bot!.answerCallbackQuery(query.id);
        await bot!.sendMessage(chatId, "\u270F\uFE0F \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u043C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C:", {
          reply_markup: {
            inline_keyboard: [[{ text: "\u274C \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C", callback_data: `cancel_edit_${reviewId}` }]],
          },
        });
        return;
      }

      if (query.data.startsWith("cancel_edit_")) {
        pendingEdits.delete(chatId);
        await bot!.editMessageText("\u274C \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E.", { chat_id: chatId, message_id: messageId });
        await bot!.answerCallbackQuery(query.id);
        return;
      }

      if (query.data.startsWith("regen_")) {
        const reviewId = query.data.replace("regen_", "");
        await bot!.answerCallbackQuery(query.id, { text: "\u041F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F..." });

        const review = await storage.getReviewById(reviewId);
        if (!review) return;

        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        const cabinet = cabinets.find(c => c.id === review.cabinetId) || cabinets[0];
        if (!cabinet) return;

        const { generateReplyForReview } = await import("./functions");
        const newDraft = await generateReplyForReview(review, cabinet);

        if (newDraft) {
          await storage.updateReview(reviewId, { aiDraft: newDraft, status: "pending" });
          const draftMsg = buildDraftMessage(review, newDraft);

          if (isPhotoMessage) {
            await bot!.editMessageCaption(draftMsg, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
            });
          } else {
            await bot!.editMessageText(draftMsg, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
            });
          }
        }
        return;
      }

    } catch (err) {
      console.error("[telegram] Callback error:", err);
      try {
        await bot!.answerCallbackQuery(query.id, { text: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430" });
      } catch {}
    }
  });

  bot.on("polling_error", (err) => {
    console.error("[telegram] Polling error:", err);
  });
}
