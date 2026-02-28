// /balance handler — subscription info + token balance

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { resolveUserByChatId } from "../middleware/auth";
import { CABINET_NOT_FOUND } from "../messages";
import { balanceKeyboard } from "../keyboards";
import { getPlanById, isUnlimited } from "@shared/subscriptionPlans";

export function registerBalanceHandler(bot: TelegramBot): void {
  bot.onText(/\/balance/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      const ctx = await resolveUserByChatId(chatId);
      if (!ctx) {
        await bot.sendMessage(chatId, CABINET_NOT_FOUND, { parse_mode: "MarkdownV2" });
        return;
      }

      const subscription = await storage.getUserSubscription(ctx.userId);

      if (subscription && (subscription.status === "active" || subscription.status === "cancelled")) {
        const plan = getPlanById(subscription.planId);
        const planName = plan?.name || subscription.planId;
        const used = subscription.repliesUsedThisPeriod || 0;
        const unlimited = plan ? isUnlimited(plan) : false;
        const limit = plan?.replyLimit || 0;
        const remaining = unlimited ? "∞" : String(Math.max(limit - used, 0));

        const periodEnd = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })
          : "—";

        const modules: string[] = [];
        if (subscription.photoAnalysisEnabled) modules.push("📸 Анализ фото");
        if (subscription.aiAnalystEnabled) modules.push("🤖 AI Аналитик");
        const modulesText = modules.length > 0 ? `\nМодули: ${modules.join(", ")}` : "";

        const statusEmoji = subscription.status === "active" ? "✅" : "⚠️";
        const statusText = subscription.status === "active" ? "Активна" : "Отменена (действует до конца периода)";

        const msgText = `💎 *Подписка*\n\n` +
          `${statusEmoji} Статус: ${statusText}\n` +
          `📋 Тариф: *${planName}*\n` +
          `📊 Использовано: *${used}* из *${unlimited ? "∞" : limit}*\n` +
          `💰 Остаток ответов: *${remaining}*\n` +
          `📅 Действует до: ${periodEnd}` +
          `${modulesText}`;

        await bot.sendMessage(chatId, msgText, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: balanceKeyboard() },
        });
      } else {
        // No subscription — show token balance (legacy/free users)
        const balance = await storage.getTokenBalance(ctx.userId);

        const msgText = `💰 *Баланс*\n\n` +
          `Подписка: не активна\n` +
          `Токенов: *${balance}*\n\n` +
          `Оформите подписку для автоответов на отзывы.`;

        await bot.sendMessage(chatId, msgText, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: balanceKeyboard() },
        });
      }
    } catch (err) {
      console.error("[bot/balance] Error:", err);
      await bot.sendMessage(chatId, "Ошибка при получении баланса.").catch(() => {});
    }
  });
}
