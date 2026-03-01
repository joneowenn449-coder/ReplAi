// /mode handler — reply mode per star rating

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { CABINET_NOT_FOUND } from "../messages";
import { replyModeKeyboard } from "../keyboards";

function buildModeText(modes: Record<string, string> | null): string {
  const m = modes || {};
  const modeLabel = (r: number) => (m[String(r)] || (r >= 4 ? "auto" : "manual")) === "auto" ? "Авто" : "Ручной";

  let text = `📝 *Режим ответов*\n\n`;
  for (let r = 1; r <= 5; r++) {
    text += `${r} ⭐ — *${modeLabel(r)}*\n`;
  }
  text += `\n💡 _Авто — ответ отправляется сразу_\n`;
  text += `💡 _Ручной — черновик на подтверждение_`;
  return text;
}

export function registerModeHandler(bot: TelegramBot): void {
  bot.onText(/\/mode/, async (msg) => {
    const chatId = String(msg.chat.id);
    await sendModeMenu(bot, chatId);
  });
}

export async function sendModeMenu(
  bot: TelegramBot,
  chatId: string,
  messageId?: number,
): Promise<void> {
  try {
    const ctx = await resolveUserByChatId(chatId);
    if (!ctx || !ctx.activeCabinet) {
      await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
      return;
    }

    const cabinet = ctx.activeCabinet;
    const modes = cabinet.replyModes as Record<string, string> | null;
    const text = buildModeText(modes);
    const keyboard = replyModeKeyboard(cabinet.id, modes);

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
    console.error("[bot/mode] Error:", err);
    await bot.sendMessage(chatId, "Ошибка при получении режимов.").catch(() => {});
  }
}
