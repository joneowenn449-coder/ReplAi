// /mode handler — redirects to /settings (reply modes are now part of unified settings)

import TelegramBot from "node-telegram-bot-api";
import { resolveUserByChatId } from "../middleware/auth";
import { CABINET_NOT_FOUND } from "../messages";
import { sendSettingsMenu } from "./settings";

export function registerModeHandler(bot: TelegramBot): void {
  bot.onText(/\/mode/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const ctx = await resolveUserByChatId(chatId);
      if (!ctx || !ctx.activeCabinet) {
        await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
        return;
      }

      await sendSettingsMenu(bot, chatId, ctx.activeCabinet.id);
    } catch (err) {
      console.error("[bot/mode] Error:", err);
      await bot.sendMessage(chatId, "Ошибка при получении режимов.").catch(() => {});
    }
  });
}
