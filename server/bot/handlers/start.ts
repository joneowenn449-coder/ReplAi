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
import { TRIAL_PLAN_ID, TRIAL_DURATION_DAYS } from "@shared/subscriptionPlans";
import { setPendingOnboarding } from "../state";

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
  // ── First check: user already has cabinets linked to this chatId ──
  // (covers users who registered via website and linked Telegram via auth_token)
  const ctxByChatId = await resolveUserByChatId(chatId);
  if (ctxByChatId && ctxByChatId.cabinets.length > 0) {
    // Also link telegramId if not yet linked
    if (telegramId) {
      await storage.linkTelegramToUser(ctxByChatId.userId, telegramId).catch(() => {});
    }
    await bot.sendMessage(chatId, ALREADY_REGISTERED, { parse_mode: "MarkdownV2" });
    return;
  }

  // ── Second check: user exists by telegramId but chatId not linked ──
  const existingUserId = await resolveUserByTelegramId(telegramId);

  if (existingUserId) {
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
    await setPendingOnboarding(chatId, { userId: user.id, cabinetId: defaultCabinet.id });
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

  // If cabinet has no API key — show onboarding flow instead of settings
  if (cabinet && !cabinet.wbApiKey) {
    await bot.sendMessage(chatId, AUTH_LINK_SUCCESS(cabinetName), { parse_mode: "MarkdownV2" });

    // Enter onboarding: ask for WB API key
    await setPendingOnboarding(chatId, { userId: result.userId, cabinetId: result.cabinetId });

    await bot.sendMessage(chatId, ASK_WB_API_KEY, {
      parse_mode: "MarkdownV2",
      reply_markup: { inline_keyboard: onboardingApiKeyKeyboard() },
    });
    return;
  }

  await bot.sendMessage(chatId, AUTH_LINK_SUCCESS(cabinetName), { parse_mode: "MarkdownV2" });
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

  // Trial subscription — 3 days free with all features
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  await storage.createSubscription({
    userId,
    planId: TRIAL_PLAN_ID,
    status: "active",
    photoAnalysisEnabled: true,
    aiAnalystEnabled: true,
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    repliesUsedThisPeriod: 0,
  });

  // AI request balance
  const aiBalance = await storage.getAiRequestBalance(userId);
  await storage.upsertAiRequestBalance(userId, aiBalance);

  console.log(`[bot/start] New user registered via Telegram: userId=${userId} tgId=${msg.from?.id}`);
}
