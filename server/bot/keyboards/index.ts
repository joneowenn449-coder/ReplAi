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

// ── Reply mode per star ──

export function replyModeKeyboard(cabinetId: string, modes: Record<string, string> | null): TelegramBot.InlineKeyboardButton[][] {
  const m = modes || {};
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  for (let r = 1; r <= 5; r++) {
    const current = m[String(r)] || (r >= 4 ? "auto" : "manual");
    keyboard.push([
      { text: `${r} ⭐`, callback_data: "noop" },
      { text: `${current === "auto" ? "✅ " : ""}Авто`, callback_data: `rmset_${r}_auto_${cabinetId}` },
      { text: `${current === "manual" ? "✅ " : ""}Ручной`, callback_data: `rmset_${r}_manual_${cabinetId}` },
    ]);
  }

  return keyboard;
}

// ── Notify settings per star ──

type NotifyMap = Record<string, boolean>;

export function notifySettingsKeyboard(cabinetId: string, notifyMap: NotifyMap): TelegramBot.InlineKeyboardButton[][] {
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  for (let r = 1; r <= 5; r++) {
    const enabled = notifyMap[String(r)] !== false;
    keyboard.push([
      { text: `${r} ⭐`, callback_data: "noop" },
      { text: `${enabled ? "✅ " : ""}Вкл`, callback_data: `ntf_${r}_on_${cabinetId}` },
      { text: `${!enabled ? "✅ " : ""}Выкл`, callback_data: `ntf_${r}_off_${cabinetId}` },
    ]);
  }

  keyboard.push([{ text: "✅ Готово", callback_data: `settings_done_${cabinetId}` }]);

  return keyboard;
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

  for (const cab of cabinets) {
    const name = cab.name || "Кабинет";
    const row: TelegramBot.InlineKeyboardButton[] = [];

    // Non-active cabinets get a switch button
    if (!cab.isActive) {
      row.push({ text: `📍 ${name}`, callback_data: `shops_switch_${cab.id}` });
    }

    // All cabinets get a key update button with explicit name
    row.push({ text: `🔑 ${name}`, callback_data: `shops_update_key_${cab.id}` });

    keyboard.push(row);
  }

  keyboard.push([{ text: "➕ Добавить кабинет", callback_data: "shops_add" }]);

  return keyboard;
}
