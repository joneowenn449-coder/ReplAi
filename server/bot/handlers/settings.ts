// /settings handler — notification settings

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { formatReplyModes } from "../utils";
import { CABINET_NOT_FOUND } from "../messages";
import { settingsKeyboard } from "../keyboards";

export function registerSettingsHandler(bot: TelegramBot): void {
  bot.onText(/\/settings/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const ctx = await resolveUserByChatId(chatId);
      if (!ctx || !ctx.activeCabinet) {
        await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
        return;
      }

      const cabinet = ctx.activeCabinet;
      const notifyType = cabinet.tgNotifyType || "all";
      const modesInfo = formatReplyModes(cabinet.replyModes as Record<string, string> | null);

      const text = `⚙️ Настройки кабинета:\n\n📝 Режим ответов:\n${modesInfo}`;
      await bot.sendMessage(chatId, text, {
        reply_markup: { inline_keyboard: settingsKeyboard(cabinet.id, notifyType) },
      });
    } catch (err) {
      console.error("[bot/settings] Error:", err);
      await bot.sendMessage(chatId, "Ошибка настроек.").catch(() => {});
    }
  });
}

/**
 * Send settings menu programmatically (called from callbacks).
 */
export async function sendSettingsMenu(
  bot: TelegramBot,
  chatId: string,
  cabinetId: string,
  messageId?: number,
): Promise<void> {
  try {
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet) return;

    const notifyType = cabinet.tgNotifyType || "all";
    const modesInfo = formatReplyModes(cabinet.replyModes as Record<string, string> | null);
    const text = `⚙️ Настройки кабинета:\n\n📝 Режим ответов:\n${modesInfo}`;
    const keyboard = settingsKeyboard(cabinet.id, notifyType);

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
    console.error("[bot/settings] Error sending settings menu:", err);
  }
}
