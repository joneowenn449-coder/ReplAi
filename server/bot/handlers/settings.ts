// /settings handler — notification settings per star rating

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { CABINET_NOT_FOUND } from "../messages";
import { notifySettingsKeyboard } from "../keyboards";

type NotifyMap = Record<string, boolean>;

function buildNotifyText(notifyMap: NotifyMap, cabinetName?: string): string {
  const nameLabel = cabinetName ? ` — ${cabinetName}` : "";
  let text = `🔔 *Уведомления${nameLabel}*\n\n`;
  for (let r = 1; r <= 5; r++) {
    const enabled = notifyMap[String(r)] !== false; // default: enabled
    text += `${r} ⭐ — ${enabled ? "✅ Вкл" : "❌ Выкл"}\n`;
  }
  return text;
}

function parseNotifySettings(cabinet: any): NotifyMap {
  // tgNotifyType was old format: "all" | "negative" | "questions"
  // New format: tgNotifyStars JSON { "1": true, "2": true, ... }
  // Migrate old format on read
  const stars = cabinet.tgNotifyStars as NotifyMap | null;
  if (stars && typeof stars === "object") return stars;

  // Fallback: migrate from old tgNotifyType
  const oldType = cabinet.tgNotifyType || "all";
  const map: NotifyMap = {};
  for (let r = 1; r <= 5; r++) {
    if (oldType === "all") map[String(r)] = true;
    else if (oldType === "negative") map[String(r)] = r <= 3;
    else if (oldType === "questions") map[String(r)] = r <= 2;
    else map[String(r)] = true;
  }
  return map;
}

export function registerSettingsHandler(bot: TelegramBot): void {
  bot.onText(/\/settings/, async (msg) => {
    const chatId = String(msg.chat.id);
    await sendSettingsMenu(bot, chatId);
  });
}

/**
 * Send notification settings menu. If messageId provided, edits.
 * Can be called with cabinetId directly (from callbacks) or resolves from chatId.
 */
export async function sendSettingsMenu(
  bot: TelegramBot,
  chatId: string,
  cabinetId?: string,
  messageId?: number,
): Promise<void> {
  try {
    let cabinet;
    if (cabinetId) {
      cabinet = await storage.getCabinetById(cabinetId);
    } else {
      const ctx = await resolveUserByChatId(chatId);
      if (!ctx || !ctx.activeCabinet) {
        await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
        return;
      }
      cabinet = ctx.activeCabinet;
    }
    if (!cabinet) return;

    const notifyMap = parseNotifySettings(cabinet);
    const text = buildNotifyText(notifyMap, cabinet.name || undefined);
    const keyboard = notifySettingsKeyboard(cabinet.id, notifyMap);

    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } catch (err) {
    console.error("[bot/settings] Error:", err);
  }
}

export { parseNotifySettings, type NotifyMap };
