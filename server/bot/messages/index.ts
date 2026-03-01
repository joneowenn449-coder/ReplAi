// Message templates for the Telegram bot

import { escapeMarkdown, truncate, ratingEmoji, ratingStarsCompact } from "../utils";

// ── Onboarding ──

export const WELCOME_NEW_USER = `🚀 *Добро пожаловать в ReplAi\\!*

AI\\-сервис автоответов на отзывы Wildberries\\.

🔥 *Что умеет ReplAi:*
• Мощный AI на негативные отзывы — детальные, эмпатичные ответы
• Быстрый AI на позитив — экономия без потери качества
• 📸 *Анализ фото* к отзывам — видим брак раньше возврата
• 📊 AI\\-аналитик вашего кабинета

Давайте подключим ваш магазин WB\\!`;

export const ASK_WB_API_KEY = `🔑 *Подключение Wildberries*

Для работы нужен API\\-ключ WB\\. Вот как его получить:

1️⃣ Откройте seller\\.wildberries\\.ru → Настройки → Доступ к API
2️⃣ Создайте новый ключ с правами: *Контент, Отзывы и вопросы*
3️⃣ Скопируйте ключ и отправьте его сюда

⚠️ Сообщение с ключом будет *автоматически удалено* для безопасности\\.

Или нажмите «Пропустить» — подключите позже через /shops\\.`;

export const API_KEY_ACCEPTED = (shopName: string) =>
  `✅ *Магазин подключён\\!*\n\n🏪 ${escapeMarkdown(shopName)}\n\nОтзывы начнут синхронизироваться автоматически\\. Вы получите уведомление о первых отзывах\\.\n\nИспользуйте /shops для управления кабинетами\\.`;

export const API_KEY_INVALID = `❌ API\\-ключ не прошёл проверку\\.\n\nУбедитесь, что ключ:\n• Создан с правами «Контент» и «Отзывы и вопросы»\n• Не истёк и активен\n\nОтправьте ключ ещё раз или нажмите «Пропустить»\\.`;

export const ONBOARDING_SKIPPED = `👌 Хорошо\\! Подключить магазин можно в любое время через /shops\\.\n\nА пока можете изучить команды бота — /help`;

export const ALREADY_REGISTERED = `👋 С возвращением\\!\n\nИспользуйте /shops для управления кабинетами или /help для списка команд\\.`;

// ── Auth token link ──

export const AUTH_LINK_SUCCESS = (cabinetName: string) =>
  `✅ Успешно подключено\\!\n\nКабинет: ${escapeMarkdown(cabinetName)}\n\nТеперь вы будете получать уведомления об отзывах\\.`;

export const AUTH_LINK_EXPIRED = `❌ Ссылка недействительна или истекла\\. Попробуйте сгенерировать новую в настройках кабинета\\.`;

// ── Error ──

export const GENERIC_ERROR = `😔 Произошла ошибка\\. Попробуйте позже или напишите /support\\.`;

export const CABINET_NOT_FOUND = `Кабинет не найден\\. Подключите бота через /start или настройки кабинета на сайте\\.`;

// ── Help ──

export const HELP_TEXT = `📋 *Команды ReplAi:*

/shops — Мои кабинеты WB
/stats — Статистика отзывов
/balance — Баланс токенов
/mode — Режим ответов
/settings — Настройки уведомлений
/support — Поддержка
/help — Эта справка`;

// ── Review notifications ──

export function buildNewReviewMessage(reviewData: {
  userName: string;
  rating: number;
  text: string;
  pros: string | null;
  cons: string | null;
  productName: string;
  productArticle: string;
  aiInsight: string | null;
  aiDraft: string | null;
}): string {
  const emoji = ratingEmoji(reviewData.rating);

  let msg = `${emoji} *НОВЫЙ ОТЗЫВ* (${reviewData.rating}/5) | Арт: ${escapeMarkdown(reviewData.productArticle)}\n\n`;
  msg += `📦 ${escapeMarkdown(reviewData.productName)}\n`;
  msg += `От: ${escapeMarkdown(reviewData.userName)}\n`;

  if (reviewData.text) {
    msg += `\n💬 *Текст:*\n«${escapeMarkdown(truncate(reviewData.text, 300))}»\n`;
  }

  if (reviewData.pros) {
    msg += `\n👍 *Плюсы:* ${escapeMarkdown(truncate(reviewData.pros, 200))}`;
  }
  if (reviewData.cons) {
    msg += `\n👎 *Минусы:* ${escapeMarkdown(truncate(reviewData.cons, 200))}`;
  }

  if (reviewData.aiDraft) {
    msg += `\n\n📝 *Предложенный ответ:*\n«${escapeMarkdown(truncate(reviewData.aiDraft, 500))}»`;
  }

  return msg;
}

export function buildDraftMessage(review: any, draft: string): string {
  const emoji = ratingEmoji(review.rating || 0);
  let msg = `${emoji} *Отзыв* (${review.rating || 0}/5) | Арт: ${escapeMarkdown(review.productArticle || "")}\n`;
  msg += `📦 ${escapeMarkdown(review.productName || "")}\n`;
  msg += `От: ${escapeMarkdown(review.authorName || "Покупатель")}\n`;
  if (review.text) {
    msg += `💬 «${escapeMarkdown(truncate(review.text, 200))}»\n`;
  }
  msg += `\n📝 *Черновик AI:*\n${escapeMarkdown(truncate(draft, 500))}`;
  return msg;
}

export function buildAutoReplyMessage(
  review: { userName: string; rating: number; text: string; productName: string; productArticle?: string },
  answer: string,
): string {
  const emoji = ratingEmoji(review.rating);
  return (
    `${emoji} *АВТО\\-ОТВЕТ ОТПРАВЛЕН* (${review.rating}/5) | Арт: ${escapeMarkdown(review.productArticle || "")}\n\n` +
    `📦 ${escapeMarkdown(review.productName || "")}\n` +
    `От: ${escapeMarkdown(review.userName || "Покупатель")}\n\n` +
    `💬 «${escapeMarkdown(truncate(review.text || "", 200))}»\n\n` +
    `📝 *Ответ:*\n«${escapeMarkdown(truncate(answer, 500))}»`
  );
}

export function buildAdminAIErrorMessage(cabinetName: string, errorCount: number, errors: string[]): string {
  const errorSample = errors.slice(0, 3).map(e => `• ${escapeMarkdown(truncate(e, 100))}`).join("\n");
  return (
    `⚠️ *Ошибки AI\\-генерации*\n\n` +
    `Кабинет: ${escapeMarkdown(cabinetName)}\n` +
    `Ошибок: ${errorCount}\n\n` +
    `${errorSample}${errors.length > 3 ? `\n\\.\\.\\.и ещё ${errors.length - 3}` : ""}`
  );
}
