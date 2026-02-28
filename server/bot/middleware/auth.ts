// Middleware: resolve user & cabinet from Telegram chatId

import { storage } from "../../storage";
import type { WbCabinet } from "@shared/schema";

export interface TelegramUserContext {
  userId: string;
  chatId: string;
  cabinets: WbCabinet[];
  activeCabinet: WbCabinet | null;
}

/**
 * Find user and cabinets by Telegram chatId.
 * Returns null if no cabinets are linked to this chatId.
 */
export async function resolveUserByChatId(chatId: string): Promise<TelegramUserContext | null> {
  const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
  if (cabinets.length === 0) return null;

  const userId = cabinets[0].userId;
  const activeCabinet = cabinets.find(c => c.isActive) || cabinets[0];

  return { userId, chatId, cabinets, activeCabinet };
}

/**
 * Find user by Telegram user ID (telegramId field in auth_users).
 * Used for onboarding flow where chatId is not yet linked to a cabinet.
 */
export async function resolveUserByTelegramId(telegramId: string): Promise<string | null> {
  const user = await storage.getAuthUserByTelegramId(telegramId);
  return user?.id ?? null;
}
