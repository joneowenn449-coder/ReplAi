// Inline keyboard builders for the Telegram bot

import TelegramBot from "node-telegram-bot-api";
import { APP_DOMAIN } from "../config";

// ── Onboarding ──

export function onboardingApiKeyKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return [
    [{ text: "⏭ Пропустить", callback_data: "onboard_skip" }],
  ];
}

// ── Review notifications ──

export function newReviewKeyboard(reviewId: string): TelegramBot.InlineKeyboardButton[][] {
  return [
    [{ text: "🤖 Сгенерировать ответ", callback_data: `gen_${reviewId}` }],
    [{ text: "💬 Чат с покупателем", url: `${APP_DOMAIN}/chats` }],
  ];
}

export function draftKeyboard(reviewId: string): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: "✅ Опубликовать", callback_data: `pub_${reviewId}` },
      { text: "✏️ Редактировать", callback_data: `edit_${reviewId}` },
    ],
    [{ text: "🔄 Перегенерировать", callback_data: `regen_${reviewId}` }],
  ];
}

export function cancelEditKeyboard(reviewId: string): TelegramBot.InlineKeyboardButton[][] {
  return [[{ text: "❌ Отменить", callback_data: `cancel_edit_${reviewId}` }]];
}

// ── Settings ──

export function settingsKeyboard(cabinetId: string, notifyType: string, replyModes: Record<string, string> | null): TelegramBot.InlineKeyboardButton[][] {
  const modes = replyModes || {};
  const highMode = modes["4"] || modes["5"] || "auto";
  const lowMode = modes["1"] || modes["2"] || modes["3"] || "manual";

  const checkN = (type: string) => notifyType === type ? "✅ " : "";
  const checkM = (group: string, mode: string) => {
    const current = group === "high" ? highMode : lowMode;
    return current === mode ? "✅ " : "";
  };

  return [
    // Reply modes — positive
    [{ text: "📝 Положительные (4-5 ⭐):", callback_data: "noop" }],
    [
      { text: `${checkM("high", "auto")}Авто`, callback_data: `rmset_high_auto_${cabinetId}` },
      { text: `${checkM("high", "manual")}Ручной`, callback_data: `rmset_high_manual_${cabinetId}` },
    ],
    // Reply modes — negative
    [{ text: "📝 Негативные (1-3 ⭐):", callback_data: "noop" }],
    [
      { text: `${checkM("low", "auto")}Авто`, callback_data: `rmset_low_auto_${cabinetId}` },
      { text: `${checkM("low", "manual")}Ручной`, callback_data: `rmset_low_manual_${cabinetId}` },
    ],
    // Notifications
    [{ text: "🔔 Уведомления:", callback_data: "noop" }],
    [
      { text: `${checkN("all")}Все`, callback_data: `notify_all_${cabinetId}` },
      { text: `${checkN("negative")}Негатив`, callback_data: `notify_neg_${cabinetId}` },
      { text: `${checkN("questions")}Вопросы`, callback_data: `notify_questions_${cabinetId}` },
    ],
    [{ text: "✅ Готово", callback_data: `settings_done_${cabinetId}` }],
  ];
}

// ── Stats ──

export function statsPeriodKeyboard(activePeriod: string): TelegramBot.InlineKeyboardButton[][] {
  const check = (p: string) => activePeriod === p ? "• " : "";
  return [
    [
      { text: `${check("today")}Сегодня`, callback_data: "stats_today" },
      { text: `${check("week")}7 дней`, callback_data: "stats_week" },
      { text: `${check("month")}30 дней`, callback_data: "stats_month" },
    ],
  ];
}

// ── Balance ──

export function balanceKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return [[{ text: "💳 Пополнить", url: `${APP_DOMAIN}/pricing` }]];
}

// ── Shops ──

import type { WbCabinet } from "@shared/schema";

export function shopsListKeyboard(cabinets: WbCabinet[]): TelegramBot.InlineKeyboardButton[][] {
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  // Switch buttons for non-active cabinets, key update for all
  for (const cab of cabinets) {
    const name = cab.name || "Кабинет";
    const row: TelegramBot.InlineKeyboardButton[] = [];

    if (!cab.isActive) {
      row.push({ text: `🔄 ${name}`, callback_data: `shops_switch_${cab.id}` });
    }
    row.push({ text: `🔑 ${cab.isActive ? name : "Ключ"}`, callback_data: `shops_update_key_${cab.id}` });

    keyboard.push(row);
  }

  keyboard.push([{ text: "➕ Добавить кабинет", callback_data: "shops_add" }]);

  return keyboard;
}
