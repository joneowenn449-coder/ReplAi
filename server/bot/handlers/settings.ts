// /settings handler — notification settings

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { CABINET_NOT_FOUND } from "../messages";
import { settingsKeyboard } from "../keyboards";

function buildSettingsText(modes: Record<string, string> | null): string {
  const m = modes || {};
  const highMode = m["4"] || m["5"] || "auto";
  const lowMode = m["1"] || m["2"] || m["3"] || "manual";
  const modeLabel = (mode: string) => mode === "auto" ? "Авто" : "Ручной";

  return `⚙️ *Настройки кабинета*\n\n` +
    `📝 *Режим ответов:*\n` +
    `Положительные (4-5 ⭐): *${modeLabel(highMode)}*\n` +
    `Негативные (1-3 ⭐): *${modeLabel(lowMode)}*\n\n` +
    `💡 _Авто — ответ отправляется сразу_\n` +
    `💡 _Ручной — черновик на подтверждение_`;
}

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
      const modes = cabinet.replyModes as Record<string, string> | null;

      const text = buildSettingsText(modes);
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: settingsKeyboard(cabinet.id, notifyType, modes) },
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
    const modes = cabinet.replyModes as Record<string, string> | null;
    const text = buildSettingsText(modes);
    const keyboard = settingsKeyboard(cabinet.id, notifyType, modes);

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
    console.error("[bot/settings] Error sending settings menu:", err);
  }
}
