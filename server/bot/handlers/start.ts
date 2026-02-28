// /start handler — onboarding + auth_token linking

import TelegramBot from "node-telegram-bot-api";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "../../storage";
import { resolveUserByChatId, resolveUserByTelegramId } from "../middleware/auth";
import {
  WELCOME_NEW_USER, ASK_WB_API_KEY, ALREADY_REGISTERED,
  AUTH_LINK_SUCCESS, AUTH_LINK_EXPIRED, GENERIC_ERROR,
} from "../messages";
import { onboardingApiKeyKeyboard, settingsKeyboard } from "../keyboards";
import { WELCOME_TOKENS } from "../config";

// Track users currently in onboarding flow (awaiting API key input)
// Map<chatId, { userId: string, cabinetId: string }>
export const pendingOnboarding = new Map<string, { userId: string; cabinetId: string }>();

export function registerStartHandler(bot: TelegramBot): void {
  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id || "");
    const payload = (match?.[1] || "").trim();

    try {
      // ── /start with auth_token — link existing web account ──
      if (payload && payload.startsWith("auth_")) {
        await handleAuthTokenLink(bot, chatId, msg, payload.replace("auth_", ""));
        return;
      }

      // ── /start without payload — onboarding or welcome back ──
      await handleOnboarding(bot, chatId, telegramId, msg);
    } catch (err) {
      console.error("[bot/start] Error:", err);
      await bot.sendMessage(chatId, GENERIC_ERROR, { parse_mode: "MarkdownV2" }).catch(() => {});
    }
  });
}

async function handleOnboarding(
  bot: TelegramBot,
  chatId: string,
  telegramId: string,
  msg: TelegramBot.Message,
): Promise<void> {
  // Check if user already exists by telegramId
  const existingUserId = await resolveUserByTelegramId(telegramId);

  if (existingUserId) {
    // User exists — check if they have cabinets linked to this chatId
    const ctx = await resolveUserByChatId(chatId);
    if (ctx && ctx.cabinets.length > 0) {
      // Fully set up — welcome back
      await bot.sendMessage(chatId, ALREADY_REGISTERED, { parse_mode: "MarkdownV2" });
      return;
    }

    // User exists but chatId not linked — link all their cabinets
    const cabinets = await storage.getCabinets(existingUserId);
    for (const cab of cabinets) {
      if (!cab.telegramChatId) {
        await storage.updateCabinet(cab.id, {
          telegramChatId: chatId,
          telegramUsername: msg.from?.username || null,
          telegramFirstName: msg.from?.first_name || null,
        } as any);
      }
    }

    await bot.sendMessage(chatId, ALREADY_REGISTERED, { parse_mode: "MarkdownV2" });
    return;
  }

  // ── New user — register via Telegram ──
  const fakeEmail = `tg_${telegramId}@replai.bot`;
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  const user = await storage.createAuthUser({
    email: fakeEmail,
    passwordHash,
    displayName: msg.from?.first_name || null,
    telegramId,
  } as any);

  // Provision profile, settings, default cabinet, welcome tokens
  await provisionNewTelegramUser(user.id, fakeEmail, msg);

  // Get the default cabinet
  const cabinets = await storage.getCabinets(user.id);
  const defaultCabinet = cabinets[0];

  if (defaultCabinet) {
    // Link chatId to the cabinet
    await storage.updateCabinet(defaultCabinet.id, {
      telegramChatId: chatId,
      telegramUsername: msg.from?.username || null,
      telegramFirstName: msg.from?.first_name || null,
    } as any);

    // Enter onboarding flow — waiting for API key
    pendingOnboarding.set(chatId, { userId: user.id, cabinetId: defaultCabinet.id });
  }

  // Send welcome message
  await bot.sendMessage(chatId, WELCOME_NEW_USER, { parse_mode: "MarkdownV2" });

  // Ask for WB API key
  await bot.sendMessage(chatId, ASK_WB_API_KEY, {
    parse_mode: "MarkdownV2",
    reply_markup: { inline_keyboard: onboardingApiKeyKeyboard() },
  });
}

async function handleAuthTokenLink(
  bot: TelegramBot,
  chatId: string,
  msg: TelegramBot.Message,
  authToken: string,
): Promise<void> {
  const result = await storage.validateAndConsumeTelegramAuthToken(authToken);
  if (!result) {
    await bot.sendMessage(chatId, AUTH_LINK_EXPIRED, { parse_mode: "MarkdownV2" });
    return;
  }

  const telegramId = String(msg.from?.id || "");
  const telegramUsername = msg.from?.username || null;
  const telegramFirstName = msg.from?.first_name || null;

  // Link chatId to the cabinet
  await storage.updateCabinet(result.cabinetId, {
    telegramChatId: chatId,
    telegramUsername,
    telegramFirstName,
  } as any);

  // Also link telegramId to the user account
  if (telegramId) {
    await storage.linkTelegramToUser(result.userId, telegramId);
  }

  const cabinet = await storage.getCabinetById(result.cabinetId);
  const cabinetName = cabinet?.name || "Кабинет";

  await bot.sendMessage(chatId, AUTH_LINK_SUCCESS(cabinetName), { parse_mode: "MarkdownV2" });

  // Show settings menu
  if (cabinet) {
    const notifyType = cabinet.tgNotifyType || "all";
    const { formatReplyModes } = await import("../utils");
    const modesInfo = formatReplyModes(cabinet.replyModes as Record<string, string> | null);

    const text = `⚙️ Настройки кабинета:\n\n📝 Режим ответов:\n${modesInfo}`;
    await bot.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: settingsKeyboard(cabinet.id, notifyType) },
    });
  }
}

/**
 * Provision a new user registered via Telegram:
 * profile, settings, default cabinet, welcome tokens
 */
async function provisionNewTelegramUser(
  userId: string,
  email: string,
  msg: TelegramBot.Message,
): Promise<void> {
  // Create profile
  await storage.upsertProfile({ id: userId, email });

  // Create settings
  const existingSettings = await storage.getSettings(userId);
  if (!existingSettings) {
    await storage.insertSettings({ userId });
  }

  // Create default cabinet
  const cabinets = await storage.getCabinets(userId);
  if (cabinets.length === 0) {
    await storage.createCabinet({ userId, name: "Основной кабинет", isActive: true });
  }

  // Welcome tokens
  await storage.upsertTokenBalance(userId, WELCOME_TOKENS);
  await storage.insertTokenTransaction({
    userId,
    amount: WELCOME_TOKENS,
    type: "welcome_bonus",
    description: "Приветственные токены",
  });

  // AI request balance
  const aiBalance = await storage.getAiRequestBalance(userId);
  await storage.upsertAiRequestBalance(userId, aiBalance);

  console.log(`[bot/start] New user registered via Telegram: userId=${userId} tgId=${msg.from?.id}`);
}
