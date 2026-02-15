import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";

let bot: TelegramBot | null = null;

export function getTelegramBot(): TelegramBot | null {
  return bot;
}

export async function sendAutoReplyNotification(cabinetId: string, review: { userName: string; rating: number; text: string; productName: string }, answer: string) {
  if (!bot) return;
  try {
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet?.telegramChatId) return;
    const stars = "\u2B50".repeat(review.rating);
    const msg = `\u2705 *\u0410\u0432\u0442\u043E-\u043E\u0442\u0432\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D*\n\n` +
      `\uD83D\uDCE6 ${escapeMarkdown(review.productName || "")}\n` +
      `${stars} \u043E\u0442 ${escapeMarkdown(review.userName || "\u041F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u044C")}\n` +
      `\uD83D\uDCAC _${escapeMarkdown(truncate(review.text || "", 200))}_\n\n` +
      `\uD83D\uDCDD *\u041E\u0442\u0432\u0435\u0442:*\n${escapeMarkdown(truncate(answer, 500))}`;
    await bot.sendMessage(cabinet.telegramChatId, msg, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("[telegram] Error sending auto-reply notification:", err);
  }
}

export async function sendManualReviewForApproval(cabinetId: string, reviewId: string, review: { userName: string; rating: number; text: string; productName: string }, aiDraft: string) {
  if (!bot) return;
  try {
    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet?.telegramChatId) return;
    const stars = "\u2B50".repeat(review.rating);
    const msg = `\uD83D\uDD14 *\u041D\u043E\u0432\u044B\u0439 \u043E\u0442\u0437\u044B\u0432 (\u0440\u0443\u0447\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C)*\n\n` +
      `\uD83D\uDCE6 ${escapeMarkdown(review.productName || "")}\n` +
      `${stars} \u043E\u0442 ${escapeMarkdown(review.userName || "\u041F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u044C")}\n` +
      `\uD83D\uDCAC _${escapeMarkdown(truncate(review.text || "", 300))}_\n\n` +
      `\uD83D\uDCDD *\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0418\u0418:*\n${escapeMarkdown(truncate(aiDraft, 500))}`;
    await bot.sendMessage(cabinet.telegramChatId, msg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "\u2705 \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C", callback_data: `send_${reviewId}` },
            { text: "\uD83D\uDD04 \u041F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C", callback_data: `regen_${reviewId}` },
          ],
        ],
      },
    });
  } catch (err) {
    console.error("[telegram] Error sending manual review:", err);
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

const WB_FEEDBACKS_URL = "https://feedbacks-api.wildberries.ru";

export function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN not set, skipping bot init");
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("[telegram] Bot started with long polling");

  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = String(msg.chat.id);
    const payload = (match?.[1] || "").trim();

    if (!payload || !payload.startsWith("auth_")) {
      await bot!.sendMessage(chatId, "\u041F\u0440\u0438\u0432\u0435\u0442! \u0427\u0442\u043E\u0431\u044B \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0431\u043E\u0442\u0430, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u00AB\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C Telegram\u00BB \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435.");
      return;
    }

    const authToken = payload.replace("auth_", "");
    try {
      const result = await storage.validateAndConsumeTelegramAuthToken(authToken);
      if (!result) {
        await bot!.sendMessage(chatId, "\u274C \u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u0430 \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430.");
        return;
      }

      await storage.updateCabinet(result.cabinetId, { telegramChatId: chatId } as any);

      const cabinet = await storage.getCabinetById(result.cabinetId);
      const cabinetName = cabinet?.name || "\u041A\u0430\u0431\u0438\u043D\u0435\u0442";

      await bot!.sendMessage(
        chatId,
        `\u2705 \u0423\u0441\u043F\u0435\u0448\u043D\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E!\n\n\u041A\u0430\u0431\u0438\u043D\u0435\u0442: ${cabinetName}\n\n\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E\u0431 \u043E\u0442\u0432\u0435\u0442\u0430\u0445 \u043D\u0430 \u043E\u0442\u0437\u044B\u0432\u044B. \u0414\u043B\u044F \u043E\u0442\u0437\u044B\u0432\u043E\u0432 \u0432 \u0440\u0443\u0447\u043D\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435 \u0432\u044B \u0441\u043C\u043E\u0436\u0435\u0442\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0438 \u043F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043E\u0442\u0432\u0435\u0442\u044B \u043F\u0440\u044F\u043C\u043E \u0437\u0434\u0435\u0441\u044C.`
      );
    } catch (err) {
      console.error("[telegram] Error handling /start:", err);
      await bot!.sendMessage(chatId, "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
    }
  });

  bot.on("callback_query", async (query) => {
    if (!query.data || !query.message) return;
    const chatId = String(query.message.chat.id);
    const messageId = query.message.message_id;

    try {
      if (query.data.startsWith("send_")) {
        const reviewId = query.data.replace("send_", "");
        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        if (cabinets.length === 0) {
          await bot!.answerCallbackQuery(query.id, { text: "\u041A\u0430\u0431\u0438\u043D\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
          return;
        }

        const review = await storage.getReviewById(reviewId);
        if (!review || !review.aiDraft) {
          await bot!.answerCallbackQuery(query.id, { text: "\u041E\u0442\u0437\u044B\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0438\u043B\u0438 \u043D\u0435\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430" });
          return;
        }

        const cabinet = cabinets.find(c => c.id === review.cabinetId) || cabinets[0];
        if (!cabinet.wbApiKey) {
          await bot!.answerCallbackQuery(query.id, { text: "API \u043A\u043B\u044E\u0447 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D" });
          return;
        }

        const wbResponse = await fetch(`${WB_FEEDBACKS_URL}/api/v1/feedbacks/answer`, {
          method: "POST",
          headers: {
            Authorization: cabinet.wbApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: review.wbId, text: review.aiDraft }),
        });

        if (!wbResponse.ok) {
          const errorText = await wbResponse.text();
          console.error("[telegram] WB send error:", errorText);
          await bot!.answerCallbackQuery(query.id, { text: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0430 WB" });
          return;
        }

        await storage.updateReview(reviewId, {
          status: "sent",
          sentAnswer: review.aiDraft,
          isEdited: false,
          updatedAt: new Date(),
        });

        if (review.userId) {
          const balance = await storage.getTokenBalance(review.userId);
          if (balance > 0) {
            await storage.updateTokenBalance(review.userId, balance - 1);
            await storage.insertTokenTransaction({
              userId: review.userId,
              amount: -1,
              type: "usage",
              description: "\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u043E\u0442\u0437\u044B\u0432 (Telegram)",
            });
          }
        }

        await bot!.editMessageText(
          `\u2705 \u041E\u0442\u0432\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D!\n\n${truncate(review.aiDraft, 500)}`,
          { chat_id: chatId, message_id: messageId }
        );
        await bot!.answerCallbackQuery(query.id, { text: "\u041E\u0442\u0432\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D!" });

      } else if (query.data.startsWith("regen_")) {
        const reviewId = query.data.replace("regen_", "");
        await bot!.answerCallbackQuery(query.id, { text: "\u041F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F..." });

        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        if (cabinets.length === 0) return;

        const review = await storage.getReviewById(reviewId);
        if (!review) return;

        const cabinet = cabinets.find(c => c.id === review.cabinetId) || cabinets[0];

        const { generateReplyForReview } = await import("./functions");
        const newDraft = await generateReplyForReview(review, cabinet);

        if (newDraft) {
          await storage.updateReview(reviewId, { aiDraft: newDraft, status: "pending" });

          const stars = "\u2B50".repeat(review.rating || 0);
          const msg = `\uD83D\uDD14 *\u041D\u043E\u0432\u044B\u0439 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0418\u0418*\n\n` +
            `\uD83D\uDCE6 ${escapeMarkdown(review.productName || "")}\n` +
            `${stars} \u043E\u0442 ${escapeMarkdown(review.authorName || "\u041F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u044C")}\n` +
            `\uD83D\uDCAC _${escapeMarkdown(truncate(review.text || "", 300))}_\n\n` +
            `\uD83D\uDCDD *\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0418\u0418:*\n${escapeMarkdown(truncate(newDraft, 500))}`;

          await bot!.editMessageText(msg, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "\u2705 \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C", callback_data: `send_${reviewId}` },
                  { text: "\uD83D\uDD04 \u041F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C", callback_data: `regen_${reviewId}` },
                ],
              ],
            },
          });
        }
      }
    } catch (err) {
      console.error("[telegram] Callback error:", err);
      try {
        await bot!.answerCallbackQuery(query.id, { text: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430" });
      } catch {}
    }
  });

  bot.on("polling_error", (err) => {
    console.error("[telegram] Polling error:", err);
  });
}
