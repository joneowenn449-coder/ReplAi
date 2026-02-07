

# Исправление: ИИ не обращается по имени к покупателю

## Проблема

Имя покупателя (`author_name`) хранится в базе данных, но не передаётся в запрос к ИИ при генерации ответа. Модель просто не знает, как зовут покупателя.

## Что будет исправлено

### 1. generate-reply (для кнопки "Перегенерировать")

**Файл:** `supabase/functions/generate-reply/index.ts`

Добавить имя покупателя в пользовательское сообщение:

```
// Было (строка 65):
const userMessage = `ВАЖНО: строго следуй...

Отзыв (${review.rating} из 5 звёзд) на товар "${review.product_name}":

${review.text || "(Без текста, только оценка)"}${attachmentInfo}`;

// Станет:
const authorName = review.author_name || "";
const nameInstruction = authorName && authorName !== "Покупатель"
  ? `\n\nИмя покупателя: ${authorName}. Обратись к покупателю по имени в ответе.`
  : "";

const userMessage = `ВАЖНО: строго следуй...

Отзыв (${review.rating} из 5 звёзд) на товар "${review.product_name}":

${review.text || "(Без текста, только оценка)"}${attachmentInfo}${nameInstruction}`;
```

Логика: если имя есть и оно не дефолтное "Покупатель" -- добавляется инструкция обратиться по имени.

### 2. sync-reviews (для автоответов при синхронизации)

**Файл:** `supabase/functions/sync-reviews/index.ts`

- Добавить параметр `authorName` в функцию `generateAIReply`
- Добавить ту же инструкцию с именем в пользовательское сообщение
- Передать `fb.userName` при вызове функции

```
// Сигнатура функции:
async function generateAIReply(
  apiKey, systemPrompt, reviewText, rating, productName,
  photoCount, hasVideo, authorName  // <-- новый параметр
)

// Внутри функции -- добавить в userMessage:
const nameInstruction = authorName && authorName !== "Покупатель"
  ? `\n\nИмя покупателя: ${authorName}. Обратись к покупателю по имени в ответе.`
  : "";

// При вызове (строка 160):
aiDraft = await generateAIReply(
  ...,
  fb.userName || ""  // <-- передать имя
);
```

## Затрагиваемые файлы

| Файл | Изменение |
|------|-----------|
| `supabase/functions/generate-reply/index.ts` | Добавить имя покупателя и инструкцию в userMessage |
| `supabase/functions/sync-reviews/index.ts` | Добавить параметр authorName в generateAIReply и передать его при вызове |

## Ожидаемый результат

- Если у покупателя указано имя (например, "Гузяль") -- ИИ обратится по имени: "Гузяль, спасибо за ваш отзыв!"
- Если имя не указано или стоит дефолтное "Покупатель" -- ИИ ответит без обращения по имени, чтобы ответ выглядел естественно
