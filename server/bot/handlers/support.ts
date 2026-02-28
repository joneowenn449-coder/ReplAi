// /support handler — link to support

import TelegramBot from "node-telegram-bot-api";

const SUPPORT_MESSAGE = `🆘 *Поддержка ReplAi*

Если у вас возникли вопросы или проблемы:

📩 Напишите нам: @replai\_support\_bot
📧 Email: support@replai\.top

Мы ответим в ближайшее время\!`;

export function registerSupportHandler(bot: TelegramBot): void {
  bot.onText(/\/support/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      await bot.sendMessage(chatId, SUPPORT_MESSAGE, { parse_mode: "MarkdownV2" });
    } catch (err) {
      console.error("[bot/support] Error:", err);
    }
  });
}
