// /help and /support handlers

import TelegramBot from "node-telegram-bot-api";
import { HELP_TEXT } from "../messages";

export function registerHelpHandler(bot: TelegramBot): void {
  bot.onText(/\/help/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      await bot.sendMessage(chatId, HELP_TEXT, { parse_mode: "MarkdownV2" });
    } catch (err) {
      console.error("[bot/help] Error:", err);
    }
  });

  bot.onText(/\/support/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      await bot.sendMessage(chatId, "📩 Поддержка: @replai\\_support\\_bot", { parse_mode: "MarkdownV2" });
    } catch (err) {
      console.error("[bot/support] Error:", err);
    }
  });
}
