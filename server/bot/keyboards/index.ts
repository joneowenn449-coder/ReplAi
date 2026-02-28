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

export function settingsKeyboard(cabinetId: string, notifyType: string): TelegramBot.InlineKeyboardButton[][] {
  const checkN = (type: string) => notifyType === type ? "✅ " : "";
  return [
    [{ text: "🔔 Уведомления:", callback_data: "noop" }],
    [
      { text: `${checkN("all")}Все`, callback_data: `notify_all_${cabinetId}` },
      { text: `${checkN("negative")}Негатив`, callback_data: `notify_neg_${cabinetId}` },
      { text: `${checkN("questions")}Вопросы`, callback_data: `notify_questions_${cabinetId}` },
    ],
    [{ text: "⚙️ Настроить режим ответов", callback_data: `rmcfg_start_${cabinetId}` }],
    [{ text: "✅ Готово", callback_data: `settings_done_${cabinetId}` }],
  ];
}

export function replyModeHighKeyboard(cabinetId: string, currentHigh: string): TelegramBot.InlineKeyboardButton[][] {
  const checkH = (m: string) => currentHigh === m ? "✅ " : "";
  return [
    [
      { text: `${checkH("manual")}Ручной`, callback_data: `rmset_high_manual_${cabinetId}` },
      { text: `${checkH("auto")}Авто`, callback_data: `rmset_high_auto_${cabinetId}` },
    ],
  ];
}

export function replyModeLowKeyboard(cabinetId: string, currentLow: string): TelegramBot.InlineKeyboardButton[][] {
  const checkL = (m: string) => currentLow === m ? "✅ " : "";
  return [
    [
      { text: `${checkL("manual")}Ручной`, callback_data: `rmset_low_manual_${cabinetId}` },
      { text: `${checkL("auto")}Авто`, callback_data: `rmset_low_auto_${cabinetId}` },
    ],
  ];
}

// ── Balance ──

export function balanceKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return [[{ text: "💳 Пополнить", url: `${APP_DOMAIN}/pricing` }]];
}

// ── Mode ──

export function modeSettingsKeyboard(cabinetId: string): TelegramBot.InlineKeyboardButton[][] {
  return [[{ text: "⚙️ Настроить", callback_data: `rmcfg_start_${cabinetId}` }]];
}

// ── Shops (add cabinet) ──

export function shopsAddKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return [[{ text: "➕ Добавить кабинет", callback_data: "shops_add" }]];
}

export function shopsManageKeyboard(cabinetId: string): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: "⚙️ Настройки", callback_data: `settings_${cabinetId}` },
      { text: "🔑 Обновить API-ключ", callback_data: `shops_update_key_${cabinetId}` },
    ],
  ];
}
