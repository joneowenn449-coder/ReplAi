// /balance handler — token balance

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { CABINET_NOT_FOUND } from "../messages";
import { balanceKeyboard } from "../keyboards";

export function registerBalanceHandler(bot: TelegramBot): void {
  bot.onText(/\/balance/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const ctx = await resolveUserByChatId(chatId);
      if (!ctx) {
        await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
        return;
      }

      const balance = await storage.getTokenBalance(ctx.userId);

      const msgText = `💰 *Баланс токенов*\n\n` +
        `Остаток: *${balance}* токенов\n\n` +
        `1 токен = 1 ответ на отзыв`;

      await bot.sendMessage(chatId, msgText, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: balanceKeyboard() },
      });
    } catch (err) {
      console.error("[bot/balance] Error:", err);
      await bot.sendMessage(chatId, "Ошибка при получении баланса.").catch(() => {});
    }
  });
}
