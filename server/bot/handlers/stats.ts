// /stats handler — today's review statistics

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { CABINET_NOT_FOUND } from "../messages";

export function registerStatsHandler(bot: TelegramBot): void {
  bot.onText(/\/stats/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const ctx = await resolveUserByChatId(chatId);
      if (!ctx) {
        await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
        return;
      }

      const cabinetIds = ctx.cabinets.map(c => c.id);
      const stats = await storage.getTodayReviewStats(cabinetIds);

      const today = new Date().toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
      const pending = stats.total - stats.answered;
      const avgStr = stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—";

      let ratingBars = "";
      for (let r = 5; r >= 1; r--) {
        const cnt = stats.byRating[r] || 0;
        const bar = cnt > 0 ? "█".repeat(Math.min(cnt, 20)) : "";
        ratingBars += `${"*".repeat(r)} ${bar} ${cnt}\n`;
      }

      const msgText = `📊 *Статистика за ${today}*\n\n` +
        `📥 Новых отзывов: *${stats.total}*\n` +
        `✅ Отвечено: *${stats.answered}*\n` +
        `⏳ Ожидают ответа: *${pending}*\n` +
        `⭐ Средний рейтинг: *${avgStr}*\n\n` +
        `📊 Распределение:\n${ratingBars}`;

      await bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("[bot/stats] Error:", err);
      await bot.sendMessage(chatId, "Ошибка при получении статистики.").catch(() => {});
    }
  });
}
