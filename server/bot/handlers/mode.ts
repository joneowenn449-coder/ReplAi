// /mode handler — reply mode settings

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { formatReplyModes } from "../utils";
import { CABINET_NOT_FOUND } from "../messages";
import { modeSettingsKeyboard } from "../keyboards";

export function registerModeHandler(bot: TelegramBot): void {
  bot.onText(/\/mode/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const ctx = await resolveUserByChatId(chatId);
      if (!ctx || !ctx.activeCabinet) {
        await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
        return;
      }

      const modesInfo = formatReplyModes(ctx.activeCabinet.replyModes as Record<string, string> | null);

      await bot.sendMessage(chatId, `📝 *Режим ответов:*\n\n${modesInfo}`, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: modeSettingsKeyboard(ctx.activeCabinet.id) },
      });
    } catch (err) {
      console.error("[bot/mode] Error:", err);
      await bot.sendMessage(chatId, "Ошибка при получении режимов.").catch(() => {});
    }
  });
}
