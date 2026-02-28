// Text message handler — API key input (onboarding) + pending edits

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { pendingOnboarding } from "./start";
import { resolveUserByChatId, resolveUserByTelegramId } from "../middleware/auth";
import { escapeMarkdown, truncate } from "../utils";
import { buildDraftMessage } from "../messages";
import { draftKeyboard } from "../keyboards";
import { API_KEY_ACCEPTED, API_KEY_INVALID, GENERIC_ERROR } from "../messages";
import { WB_CONTENT_URL } from "../config";

// Pending edits: chatId → reviewId (user is editing a draft)
export const pendingEdits = new Map<string, string>();

// Pending API key updates: chatId → cabinetId (user is updating key for existing cabinet)
export const pendingApiKeyUpdate = new Map<string, string>();

export function registerTextHandler(bot: TelegramBot): void {
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    const chatId = String(msg.chat.id);

    try {
      // ── Onboarding: waiting for API key ──
      const onboardCtx = pendingOnboarding.get(chatId);
      if (onboardCtx) {
        await handleApiKeyInput(bot, chatId, msg, onboardCtx.userId, onboardCtx.cabinetId, true);
        return;
      }

      // ── Update API key for existing cabinet ──
      const updateCabinetId = pendingApiKeyUpdate.get(chatId);
      if (updateCabinetId) {
        const cabinet = await storage.getCabinetById(updateCabinetId);
        if (cabinet) {
          await handleApiKeyInput(bot, chatId, msg, cabinet.userId, updateCabinetId, false);
        }
        return;
      }

      // ── Pending edit: user is sending new draft text ──
      const reviewId = pendingEdits.get(chatId);
      if (reviewId) {
        await handleDraftEdit(bot, chatId, msg, reviewId);
        return;
      }

      // ── Fallback: detect API key input even if pendingOnboarding was lost (bot restart) ──
      // If user has a cabinet without API key and sends a long token-like string — treat as key input
      const text = msg.text.trim();
      if (looksLikeApiKey(text)) {
        const fallbackCtx = await findCabinetAwaitingApiKey(chatId, String(msg.from?.id || ""));
        if (fallbackCtx) {
          console.log(`[bot/text] Fallback API key detection for chatId=${chatId} cabinet=${fallbackCtx.cabinetId}`);
          await handleApiKeyInput(bot, chatId, msg, fallbackCtx.userId, fallbackCtx.cabinetId, true);
          return;
        }
      }

      // No active context — ignore
    } catch (err) {
      console.error("[bot/text] Error:", err);
    }
  });
}

async function handleApiKeyInput(
  bot: TelegramBot,
  chatId: string,
  msg: TelegramBot.Message,
  userId: string,
  cabinetId: string,
  isOnboarding: boolean,
): Promise<void> {
  const apiKey = msg.text!.trim();

  // Auto-delete the message with the API key for security
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (delErr) {
    console.error("[bot/text] Failed to delete API key message:", delErr);
  }

  // Validate the API key against WB API
  const validation = await validateWbApiKey(apiKey);

  if (!validation.valid) {
    await bot.sendMessage(chatId, API_KEY_INVALID, {
      parse_mode: "MarkdownV2",
      reply_markup: isOnboarding
        ? { inline_keyboard: [[{ text: "⏭ Пропустить", callback_data: "onboard_skip" }]] }
        : undefined,
    });
    return;
  }

  // Save the API key and brand name
  await storage.updateCabinet(cabinetId, {
    wbApiKey: apiKey,
    name: validation.shopName || "Кабинет WB",
    brandName: validation.shopName || "",
    apiStatus: "active",
    apiStatusCheckedAt: new Date(),
  } as any);

  // Clear pending state
  if (isOnboarding) {
    pendingOnboarding.delete(chatId);
  } else {
    pendingApiKeyUpdate.delete(chatId);
  }

  const shopName = validation.shopName || "Кабинет WB";
  await bot.sendMessage(chatId, API_KEY_ACCEPTED(shopName), { parse_mode: "MarkdownV2" });

  console.log(`[bot/text] API key accepted for cabinet=${cabinetId} shop=${shopName}`);
}

async function handleDraftEdit(
  bot: TelegramBot,
  chatId: string,
  msg: TelegramBot.Message,
  reviewId: string,
): Promise<void> {
  pendingEdits.delete(chatId);
  const newText = msg.text!;

  await storage.updateReview(reviewId, { aiDraft: newText, status: "pending" });
  const review = await storage.getReviewById(reviewId);
  if (!review) return;

  const draftMsg = buildDraftMessage(review, newText);
  await bot.sendMessage(chatId, draftMsg, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
  });
}

/**
 * Check if a string looks like a WB API key (JWT or long base64 token).
 * WB keys are typically JWT tokens (eyJ...) or long alphanumeric strings.
 */
function looksLikeApiKey(text: string): boolean {
  // No spaces (API keys are single tokens), at least 50 chars
  if (text.includes(" ") || text.length < 50) return false;
  // JWT pattern: eyJ...
  if (/^eyJ[A-Za-z0-9_-]+\./.test(text)) return true;
  // Long base64-like string (WB sometimes uses non-JWT keys)
  if (/^[A-Za-z0-9_\-+/=.]{50,}$/.test(text)) return true;
  return false;
}

/**
 * Find a cabinet without API key for the given chatId or telegramId.
 * Used as fallback when pendingOnboarding map was lost (bot restart).
 */
async function findCabinetAwaitingApiKey(
  chatId: string,
  telegramId: string,
): Promise<{ userId: string; cabinetId: string } | null> {
  // Try by chatId first
  const ctx = await resolveUserByChatId(chatId);
  if (ctx) {
    const cabinetWithoutKey = ctx.cabinets.find(c => !c.wbApiKey);
    if (cabinetWithoutKey) {
      return { userId: ctx.userId, cabinetId: cabinetWithoutKey.id };
    }
  }

  // Try by telegramId
  if (telegramId) {
    const userId = await resolveUserByTelegramId(telegramId);
    if (userId) {
      const cabinets = await storage.getCabinets(userId);
      const cabinetWithoutKey = cabinets.find(c => !c.wbApiKey);
      if (cabinetWithoutKey) {
        return { userId, cabinetId: cabinetWithoutKey.id };
      }
    }
  }

  return null;
}

/**
 * Validate WB API key by calling the WB Content API.
 * Returns shop name if valid.
 */
async function validateWbApiKey(apiKey: string): Promise<{ valid: boolean; shopName?: string }> {
  try {
    // Use the WB seller info endpoint to validate the key
    const response = await fetch(`${WB_CONTENT_URL}/content/v2/get/cards/list`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settings: { cursor: { limit: 1 }, filter: { withPhoto: -1 } },
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false };
    }

    if (response.ok) {
      // Try to get brand/shop name from the first card
      const data = await response.json() as any;
      const cards = data?.cards || data?.data?.cards || [];
      const brand = cards[0]?.brand || "";
      return { valid: true, shopName: brand || undefined };
    }

    // 5xx or other — treat as valid (WB might be down)
    if (response.status >= 500) {
      return { valid: true };
    }

    return { valid: false };
  } catch (err) {
    console.error("[bot/text] WB API validation error:", err);
    // Network error — give benefit of doubt
    return { valid: true };
  }
}
