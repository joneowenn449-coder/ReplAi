// /shops handler — list and manage WB cabinets

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { escapeMarkdown, formatReplyModes } from "../utils";
import { CABINET_NOT_FOUND } from "../messages";
import { shopsListKeyboard } from "../keyboards";

export function registerShopsHandler(bot: TelegramBot): void {
  bot.onText(/\/shops/, async (msg) => {
    const chatId = String(msg.chat.id);
    await sendShopsList(bot, chatId);
  });
}

/**
 * Send shops list (reused by command and callbacks).
 * If messageId is provided, edits the existing message.
 */
export async function sendShopsList(
  bot: TelegramBot,
  chatId: string,
  messageId?: number,
): Promise<void> {
  try {
    const ctx = await resolveUserByChatId(chatId);
    if (!ctx) {
      await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
      return;
    }

    let msgText = "🏪 *Мои кабинеты WB:*\n\n";

    for (const cab of ctx.cabinets) {
      const hasKey = !!cab.wbApiKey;
      const isActive = cab.isActive;
      const activeLabel = isActive ? " ← активный" : "";
      const statusIcon = hasKey ? "🟢" : "🔴";
      const statusText = hasKey ? "Подключён" : "Нет API-ключа";
      const syncDate = cab.lastSyncAt
        ? new Date(cab.lastSyncAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
        : "не было";
      const modesInfo = formatReplyModes(cab.replyModes as Record<string, string> | null);

      msgText += `${statusIcon} *${escapeMarkdown(cab.name || "Кабинет")}*${activeLabel}\n`;
      msgText += `Статус: ${statusText}\n`;
      msgText += `Синхронизация: ${syncDate}\n`;
      msgText += `Режим: ${modesInfo}\n\n`;
    }

    const keyboard = shopsListKeyboard(ctx.cabinets);

    if (messageId) {
      await bot.editMessageText(msgText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    } else {
      await bot.sendMessage(chatId, msgText, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } catch (err) {
    console.error("[bot/shops] Error:", err);
    await bot.sendMessage(chatId, "Ошибка при получении списка кабинетов.").catch(() => {});
  }
}
