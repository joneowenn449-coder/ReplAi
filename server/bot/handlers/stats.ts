// /stats handler — review statistics with period selection

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { CABINET_NOT_FOUND } from "../messages";
import { statsPeriodKeyboard } from "../keyboards";

type StatsPeriod = "today" | "week" | "month";

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "сегодня",
  week: "7 дней",
  month: "30 дней",
};

function getPeriodStart(period: StatsPeriod): Date {
  switch (period) {
    case "today": {
      // Midnight in Moscow (UTC+3)
      const msk = new Date(Date.now() + 3 * 60 * 60 * 1000);
      msk.setUTCHours(0, 0, 0, 0);
      return new Date(msk.getTime() - 3 * 60 * 60 * 1000);
    }
    case "week":
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
}

export function registerStatsHandler(bot: TelegramBot): void {
  bot.onText(/\/stats/, async (msg) => {
    const chatId = String(msg.chat.id);
    await sendStats(bot, chatId, "today");
  });
}

/**
 * Send stats for a given period. If messageId provided, edits the message.
 */
export async function sendStats(
  bot: TelegramBot,
  chatId: string,
  period: StatsPeriod,
  messageId?: number,
): Promise<void> {
  try {
    const ctx = await resolveUserByChatId(chatId);
    if (!ctx) {
      await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
      return;
    }

    const cabinetIds = ctx.cabinets.map(c => c.id);
    const since = getPeriodStart(period);
    const [stats, totalPending] = await Promise.all([
      storage.getReviewStatsSince(cabinetIds, since),
      storage.getPendingReviewCount(cabinetIds),
    ]);

    const periodLabel = PERIOD_LABELS[period];
    const avgStr = stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—";

    let ratingBars = "";
    for (let r = 5; r >= 1; r--) {
      const cnt = stats.byRating[r] || 0;
      const bar = cnt > 0 ? "🟩".repeat(Math.min(cnt, 15)) : "";
      ratingBars += `${"⭐".repeat(r)} ${bar} ${cnt}\n`;
    }

    const msgText = `📊 *Статистика за ${periodLabel}*\n\n` +
      `📥 Новых отзывов: *${stats.total}*\n` +
      `✅ Отвечено: *${stats.answered}*\n` +
      `⏳ Ожидают ответа: *${totalPending}*\n` +
      `⭐ Средний рейтинг: *${avgStr}*\n\n` +
      `📊 Распределение:\n${ratingBars}`;

    const keyboard = statsPeriodKeyboard(period);

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
    console.error("[bot/stats] Error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    const fallback = `⚠️ Не удалось загрузить статистику\n\nПопробуйте ещё раз через /stats\n\n_Ошибка: ${errMsg.slice(0, 100)}_`;
    if (messageId) {
      await bot.editMessageText(fallback, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown" }).catch(() => {});
    } else {
      await bot.sendMessage(chatId, fallback, { parse_mode: "Markdown" }).catch(() => {});
    }
  }
}
