// Callback query handler — all inline button actions

import TelegramBot from "node-telegram-bot-api";
import { storage } from "../../storage";
import { sendSettingsMenu } from "./settings";
import { sendShopsList } from "./shops";
import { sendStats } from "./stats";
import { pendingOnboarding } from "./start";
import { pendingEdits, pendingApiKeyUpdate } from "./text";
import { escapeMarkdown, truncate } from "../utils";
import { buildDraftMessage, ONBOARDING_SKIPPED, ASK_WB_API_KEY } from "../messages";
import { draftKeyboard, cancelEditKeyboard, replyModeHighKeyboard, replyModeLowKeyboard, onboardingApiKeyKeyboard } from "../keyboards";
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
        pendingOnboarding.delete(chatId);
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
        // Enter API key input mode for a new cabinet
        const cabinets = await storage.getCabinetsByTelegramChatId(chatId);
        if (cabinets.length === 0) {
          await bot.answerCallbackQuery(query.id, { text: "Сначала зарегистрируйтесь через /start" });
          return;
        }

        const userId = cabinets[0].userId;
        const newCabinet = await storage.createCabinet({ userId, name: "Новый кабинет", isActive: false });

        // Link chatId
        await storage.updateCabinet(newCabinet.id, {
          telegramChatId: chatId,
        } as any);

        pendingApiKeyUpdate.set(chatId, newCabinet.id);

        await bot.sendMessage(chatId, ASK_WB_API_KEY, {
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: onboardingApiKeyKeyboard() },
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Shops: update API key for existing cabinet ──
      if (data.startsWith("shops_update_key_")) {
        const cabinetId = data.replace("shops_update_key_", "");
        pendingApiKeyUpdate.set(chatId, cabinetId);

        await bot.sendMessage(chatId, "🔑 Отправьте новый API\\-ключ WB\\. Сообщение будет автоматически удалено\\.", {
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: [[{ text: "❌ Отменить", callback_data: "cancel_key_update" }]] },
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      if (data === "cancel_key_update") {
        pendingApiKeyUpdate.delete(chatId);
        await bot.editMessageText("❌ Обновление ключа отменено.", { chat_id: chatId, message_id: messageId });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Notification type ──
      if (data.startsWith("notify_")) {
        const parts = data.split("_");
        const typeKey = parts[1];
        const cabinetId = parts.slice(2).join("_");

        const typeMap: Record<string, string> = { all: "all", neg: "negative", questions: "questions" };
        const newType = typeMap[typeKey] || "all";

        await storage.updateCabinet(cabinetId, { tgNotifyType: newType } as any);
        await sendSettingsMenu(bot, chatId, cabinetId, messageId);
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Reply mode config ──
      if (data.startsWith("rmcfg_start_")) {
        const cabinetId = data.replace("rmcfg_start_", "");
        const cabinet = await storage.getCabinetById(cabinetId);
        if (!cabinet) return;

        const modes = (cabinet.replyModes as Record<string, string>) || {};
        const currentHigh = modes["4"] || modes["5"] || "auto";

        await bot.editMessageText("⭐⭐⭐⭐-⭐⭐⭐⭐⭐ Режим для 4-5 звёзд:", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: replyModeHighKeyboard(cabinetId, currentHigh) },
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      if (data.startsWith("rmset_")) {
        const parts = data.split("_");
        const group = parts[1]; // high or low
        const mode = parts[2]; // manual or auto
        const cabinetId = parts.slice(3).join("_");

        const cabinet = await storage.getCabinetById(cabinetId);
        const currentModes = (cabinet?.replyModes as Record<string, string>) || {};

        if (group === "high") {
          currentModes["4"] = mode;
          currentModes["5"] = mode;
          await storage.updateCabinet(cabinetId, { replyModes: currentModes } as any);

          const currentLow = currentModes["1"] || currentModes["2"] || currentModes["3"] || "manual";
          await bot.editMessageText("⭐-⭐⭐⭐ Режим для 1-3 звёзд:", {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { inline_keyboard: replyModeLowKeyboard(cabinetId, currentLow) },
          });
          await bot.answerCallbackQuery(query.id);
        } else if (group === "low") {
          currentModes["1"] = mode;
          currentModes["2"] = mode;
          currentModes["3"] = mode;
          await storage.updateCabinet(cabinetId, { replyModes: currentModes } as any);
          await sendSettingsMenu(bot, chatId, cabinetId, messageId);
          await bot.answerCallbackQuery(query.id, { text: "Режим ответов сохранён!" });
        }
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
        pendingEdits.set(chatId, reviewId);
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, "✏️ Отправьте новый текст ответа следующим сообщением:", {
          reply_markup: { inline_keyboard: cancelEditKeyboard(reviewId) },
        });
        return;
      }

      if (data.startsWith("cancel_edit_")) {
        pendingEdits.delete(chatId);
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
