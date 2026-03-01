// Callback query handler — all inline button actions

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { sendSettingsMenu, parseNotifySettings } from "./settings";
import { sendModeMenu } from "./mode";
import { sendShopsList } from "./shops";
import { sendStats } from "./stats";
import {
  clearPendingOnboarding, setPendingState, clearPendingState,
} from "../state";
import { escapeMarkdown, truncate } from "../utils";
import { buildDraftMessage, ONBOARDING_SKIPPED, ASK_WB_API_KEY } from "../messages";
import { draftKeyboard, cancelEditKeyboard, onboardingApiKeyKeyboard } from "../keyboards";
import { WB_FEEDBACKS_URL } from "../config";

export function registerCallbackHandler(bot: TelegramBot): void {
  bot.on("callback_query", async (query) => {
    if (!query.data || !query.message) return;
    const chatId = String(query.message.chat.id);
    const messageId = query.message.message_id;
    const isPhotoMessage = !!(query.message as any).photo;

    try {
      const data = query.data;

      // ── Noop ──
      if (data === "noop") {
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Onboarding: skip API key ──
      if (data === "onboard_skip") {
        await clearPendingOnboarding(chatId);
        await bot.editMessageText("", { chat_id: chatId, message_id: messageId }).catch(() => {});
        await bot.sendMessage(chatId, ONBOARDING_SKIPPED, { parse_mode: "MarkdownV2" });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Stats: period switch ──
      if (data.startsWith("stats_")) {
        const period = data.replace("stats_", "") as "today" | "week" | "month";
        if (["today", "week", "month"].includes(period)) {
          await bot.answerCallbackQuery(query.id);
          await sendStats(bot, chatId, period, messageId);
          return;
        }
      }

      // ── Shops: switch active cabinet ──
      if (data.startsWith("shops_switch_")) {
        const cabinetId = data.replace("shops_switch_", "");
        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        const target = cabinets.find(c => c.id === cabinetId);
        if (!target) {
          await bot.answerCallbackQuery(query.id, { text: "Кабинет не найден" });
          return;
        }

        // Deactivate all, activate target
        const userId = cabinets[0].userId;
        for (const cab of cabinets) {
          if (cab.isActive) {
            await storage.updateCabinet(cab.id, { isActive: false } as any);
          }
        }
        await storage.updateCabinet(cabinetId, { isActive: true } as any);

        await bot.answerCallbackQuery(query.id, { text: `Активный: ${target.name || "Кабинет"}` });
        await sendShopsList(bot, chatId, messageId);
        return;
      }

      // ── Shops: add new cabinet ──
      if (data === "shops_add") {
        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        if (cabinets.length === 0) {
          await bot.answerCallbackQuery(query.id, { text: "Сначала зарегистрируйтесь через /start" });
          return;
        }

        // Deferred creation: don't create cabinet until API key is validated
        await setPendingState(chatId, "new_cabinet", cabinets[0].userId);

        await bot.sendMessage(chatId, ASK_WB_API_KEY, {
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: [[{ text: "❌ Отменить", callback_data: "cancel_new_cabinet" }]] },
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Shops: update API key for existing cabinet ──
      if (data.startsWith("shops_update_key_")) {
        const cabinetId = data.replace("shops_update_key_", "");
        await setPendingState(chatId, "api_key_update", cabinetId);

        await bot.sendMessage(chatId, "🔑 Отправьте новый API\\-ключ WB\\. Сообщение будет автоматически удалено\\.", {
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: [[{ text: "❌ Отменить", callback_data: "cancel_key_update" }]] },
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      if (data === "cancel_key_update") {
        await clearPendingState(chatId, "api_key_update");
        await bot.editMessageText("❌ Обновление ключа отменено.", { chat_id: chatId, message_id: messageId });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      if (data === "cancel_new_cabinet") {
        await clearPendingState(chatId, "new_cabinet");
        await bot.editMessageText("❌ Добавление кабинета отменено.", { chat_id: chatId, message_id: messageId });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Notification per star: ntf_{rating}_{on|off}_{cabinetId} ──
      if (data.startsWith("ntf_")) {
        const parts = data.split("_");
        const rating = parts[1]; // 1-5
        const state = parts[2]; // on or off
        const cabinetId = parts.slice(3).join("_");

        const cabinet = await storage.getCabinetById(cabinetId);
        if (!cabinet) { await bot.answerCallbackQuery(query.id); return; }

        const notifyMap = parseNotifySettings(cabinet);
        notifyMap[rating] = state === "on";

        await storage.updateCabinet(cabinetId, { tgNotifyStars: notifyMap } as any);
        await sendSettingsMenu(bot, chatId, cabinetId, messageId);
        await bot.answerCallbackQuery(query.id, { text: "Сохранено ✅" });
        return;
      }

      // ── Reply mode per star: rmset_{rating}_{auto|manual}_{cabinetId} ──
      if (data.startsWith("rmset_")) {
        const parts = data.split("_");
        const rating = parts[1]; // 1-5
        const mode = parts[2]; // auto or manual
        const cabinetId = parts.slice(3).join("_");

        const cabinet = await storage.getCabinetById(cabinetId);
        const currentModes = (cabinet?.replyModes as Record<string, string>) || {};
        currentModes[rating] = mode;

        await storage.updateCabinet(cabinetId, { replyModes: currentModes } as any);
        await sendModeMenu(bot, chatId, messageId);
        await bot.answerCallbackQuery(query.id, { text: "Сохранено ✅" });
        return;
      }

      // ── Settings done ──
      if (data.startsWith("settings_done_")) {
        await bot.editMessageText("✅ Настройки сохранены!", {
          chat_id: chatId,
          message_id: messageId,
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Generate AI draft ──
      if (data.startsWith("gen_")) {
        const reviewId = data.replace("gen_", "");
        await bot.answerCallbackQuery(query.id, { text: "Генерация ответа..." });

        const review = await storage.getReviewById(reviewId);
        if (!review) return;

        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        const cabinet = cabinets.find(c => c.id === review.cabinetId) || cabinets[0];
        if (!cabinet) return;

        const { generateReplyForReview } = await import("../../functions");
        const newDraft = await generateReplyForReview(review, cabinet);

        if (newDraft) {
          await storage.updateReview(reviewId, { aiDraft: newDraft, status: "pending" });
          const draftMsg = buildDraftMessage(review, newDraft);

          if (isPhotoMessage) {
            await bot.editMessageCaption(draftMsg, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
            });
          } else {
            await bot.editMessageText(draftMsg, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
            });
          }
        }
        return;
      }

      // ── Publish draft to WB ──
      if (data.startsWith("pub_")) {
        const reviewId = data.replace("pub_", "");

        const review = await storage.getReviewById(reviewId);
        if (!review || !review.aiDraft) {
          await bot.answerCallbackQuery(query.id, { text: "Отзыв не найден или нет черновика" });
          return;
        }

        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        const cabinet = cabinets.find(c => c.id === review.cabinetId) || cabinets[0];
        if (!cabinet?.wbApiKey) {
          await bot.answerCallbackQuery(query.id, { text: "API ключ не настроен" });
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
          console.error("[bot/callbacks] WB send error:", errorText);
          await bot.answerCallbackQuery(query.id, { text: "Ошибка отправки на WB" });
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
              description: "Ответ на отзыв (Telegram)",
            });
          }
        }

        const pubText = `✅ *Опубликовано*\n\n${escapeMarkdown(truncate(review.aiDraft, 500))}`;
        if (isPhotoMessage) {
          await bot.editMessageCaption(pubText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
          });
        } else {
          await bot.editMessageText(pubText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
          });
        }
        await bot.answerCallbackQuery(query.id, { text: "Опубликовано!" });
        return;
      }

      // ── Edit draft ──
      if (data.startsWith("edit_")) {
        const reviewId = data.replace("edit_", "");
        await setPendingState(chatId, "edit", reviewId);
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, "✏️ Отправьте новый текст ответа следующим сообщением:", {
          reply_markup: { inline_keyboard: cancelEditKeyboard(reviewId) },
        });
        return;
      }

      if (data.startsWith("cancel_edit_")) {
        await clearPendingState(chatId, "edit");
        await bot.editMessageText("❌ Редактирование отменено.", { chat_id: chatId, message_id: messageId });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Regenerate draft ──
      if (data.startsWith("regen_")) {
        const reviewId = data.replace("regen_", "");
        await bot.answerCallbackQuery(query.id, { text: "Перегенерация..." });

        const review = await storage.getReviewById(reviewId);
        if (!review) return;

        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        const cabinet = cabinets.find(c => c.id === review.cabinetId) || cabinets[0];
        if (!cabinet) return;

        const { generateReplyForReview } = await import("../../functions");
        const newDraft = await generateReplyForReview(review, cabinet);

        if (newDraft) {
          await storage.updateReview(reviewId, { aiDraft: newDraft, status: "pending" });
          const draftMsg = buildDraftMessage(review, newDraft);

          if (isPhotoMessage) {
            await bot.editMessageCaption(draftMsg, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
            });
          } else {
            await bot.editMessageText(draftMsg, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: draftKeyboard(reviewId) },
            });
          }
        }
        return;
      }

    } catch (err) {
      console.error("[bot/callbacks] Callback error:", err);
      try {
        await bot.answerCallbackQuery(query.id, { text: "Произошла ошибка" });
      } catch {}
    }
  });
}
