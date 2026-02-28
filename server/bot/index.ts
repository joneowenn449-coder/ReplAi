// TG Bot v2 — modular entry point
// Replaces monolithic server/telegram.ts

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../storage";
import { APP_DOMAIN, WB_FEEDBACKS_URL } from "./config";
import { escapeMarkdown, truncate, ratingEmoji } from "./utils";
import { buildNewReviewMessage, buildAutoReplyMessage, buildAdminAIErrorMessage } from "./messages";
import { newReviewKeyboard } from "./keyboards";

// Handlers
import { registerStartHandler } from "./handlers/start";
import { registerShopsHandler } from "./handlers/shops";
import { registerStatsHandler } from "./handlers/stats";
import { registerBalanceHandler } from "./handlers/balance";
import { registerModeHandler } from "./handlers/mode";
import { registerSettingsHandler } from "./handlers/settings";
import { registerHelpHandler } from "./handlers/help";
import { registerCallbackHandler } from "./handlers/callbacks";
import { registerSupportHandler } from "./handlers/support";
import { registerTextHandler } from "./handlers/text";

let bot: TelegramBot | null = null;

export function getTelegramBot(): TelegramBot | null {
  return bot;
}

// ── Notification functions (called from functions.ts / routes.ts) ──

export function shouldNotify(cabinet: any, rating: number, reviewText: string | null): boolean {
  const notifyType = cabinet.tgNotifyType || "all";
  switch (notifyType) {
    case "all": return true;
    case "negative": return rating <= 3;
    case "questions": return (reviewText || "").includes("?");
    default: return true;
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
  if (!bot) {
    console.log(`[bot] sendNewReview: bot is null, skipping cabinet=${cabinetId} rating=${reviewData.rating}`);
    return;
  }
  try {
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet?.telegramChatId) {
      console.log(`[bot] sendNewReview: no telegramChatId for cabinet=${cabinetId}`);
      return;
    }

    if (!shouldNotify(cabinet, reviewData.rating, reviewData.text)) {
      console.log(`[bot] sendNewReview: shouldNotify=false cabinet=${cabinetId} rating=${reviewData.rating}`);
      return;
    }

    const msg = buildNewReviewMessage(reviewData);
    const keyboard = newReviewKeyboard(reviewId);

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
    console.log(`[bot] sendNewReview: sent to chatId=${cabinet.telegramChatId} cabinet=${cabinetId} rating=${reviewData.rating}`);
  } catch (err) {
    console.error("[bot] Error sending new review notification:", err);
  }
}

export async function sendAutoReplyNotification(
  cabinetId: string,
  review: { userName: string; rating: number; text: string; productName: string; productArticle?: string },
  answer: string
) {
  if (!bot) {
    console.log(`[bot] sendAutoReply: bot is null, skipping cabinet=${cabinetId} rating=${review.rating}`);
    return;
  }
  try {
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet?.telegramChatId) {
      console.log(`[bot] sendAutoReply: no telegramChatId for cabinet=${cabinetId}`);
      return;
    }

    if (!shouldNotify(cabinet, review.rating, review.text)) {
      console.log(`[bot] sendAutoReply: shouldNotify=false cabinet=${cabinetId} rating=${review.rating}`);
      return;
    }

    const msg = buildAutoReplyMessage(review, answer);
    await bot.sendMessage(cabinet.telegramChatId, msg, { parse_mode: "MarkdownV2" });
    console.log(`[bot] sendAutoReply: sent to chatId=${cabinet.telegramChatId} cabinet=${cabinetId} rating=${review.rating}`);
  } catch (err) {
    console.error("[bot] Error sending auto-reply notification:", err);
  }
}

const adminErrorThrottle = new Map<string, number>();
const ADMIN_ERROR_THROTTLE_MS = 30 * 60 * 1000;

export async function sendAdminAIErrorNotification(errorCount: number, cabinetName: string, errors: string[]) {
  if (!bot) return;

  const now = Date.now();
  const lastSent = adminErrorThrottle.get(cabinetName) || 0;
  if (now - lastSent < ADMIN_ERROR_THROTTLE_MS) {
    console.log(`[bot] AI error notification throttled for cabinet=${cabinetName}`);
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
        const msg = buildAdminAIErrorMessage(cabinetName, errorCount, errors);
        await bot.sendMessage(cab.telegramChatId, msg, { parse_mode: "MarkdownV2" });
      }
    }

    adminErrorThrottle.set(cabinetName, now);
  } catch (err) {
    console.error("[bot] Error sending admin AI error notification:", err);
  }
}

// ── Bot lifecycle ──

export async function stopTelegramBot() {
  if (bot) {
    try {
      await bot.stopPolling();
      console.log("[bot] Stopped bot polling");
    } catch (e) {}
    bot = null;
  }
}

export async function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[bot] TELEGRAM_BOT_TOKEN not set, skipping bot init");
    return;
  }

  await stopTelegramBot();

  // Clean up any existing webhook/polling sessions
  const tempBot = new TelegramBot(token, { polling: false });
  try {
    await tempBot.deleteWebHook({ drop_pending_updates: true });
    console.log("[bot] Cleared webhook/pending getUpdates sessions");
  } catch (e) {
    console.warn("[bot] deleteWebHook failed (non-critical):", (e as any)?.message);
  }
  try { await tempBot.stopPolling(); } catch (_) {}
  try { (tempBot as any).close?.(); } catch (_) {}

  await new Promise(resolve => setTimeout(resolve, 5000));

  bot = new TelegramBot(token, {
    polling: {
      autoStart: true,
      params: { timeout: 30 },
    },
  });

  bot.on("polling_error", (err: any) => {
    if (err?.code === "ETELEGRAM" && err?.response?.body?.error_code === 409) {
      console.warn("[bot] Polling conflict (409) — another instance may be running, will retry...");
    } else {
      console.error("[bot] Polling error:", err?.message || err);
    }
  });

  console.log("[bot] Bot started with long polling");

  // Set bot commands menu
  bot.setMyCommands([
    { command: "start", description: "Перезапуск / подключение" },
    { command: "shops", description: "Мои кабинеты WB" },
    { command: "stats", description: "Статистика отзывов" },
    { command: "subscription", description: "Подписка и тариф" },
    { command: "mode", description: "Режим ответов" },
    { command: "settings", description: "Настройки уведомлений" },
    { command: "help", description: "Справка" },
    { command: "support", description: "Поддержка" },
  ]).catch(err => console.error("[bot] Error setting commands:", err));

  // Register all handlers
  registerStartHandler(bot);
  registerShopsHandler(bot);
  registerStatsHandler(bot);
  registerBalanceHandler(bot);
  registerModeHandler(bot);
  registerSettingsHandler(bot);
  registerHelpHandler(bot);
  registerSupportHandler(bot);
  registerTextHandler(bot);
  registerCallbackHandler(bot);
}
