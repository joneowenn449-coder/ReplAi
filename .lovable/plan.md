

# Исправление ошибки отправки ответа на отзыв

## Причина ошибки

Функция `send-reply` отправляет запрос на неправильный эндпоинт WB API:

| | Сейчас (ошибка) | Нужно (правильно) |
|---|---|---|
| URL | `/api/v1/feedbacks` | `/api/v1/feedbacks/answer` |
| Метод | `PATCH` | `POST` |

Эндпоинт `/api/v1/feedbacks` принимает только GET/HEAD (получение списка отзывов), поэтому WB возвращает 405 Method Not Allowed.

По документации WB API:
- `POST /api/v1/feedbacks/answer` -- отправить новый ответ на отзыв
- `PATCH /api/v1/feedbacks/answer` -- отредактировать уже отправленный ответ

## Что будет исправлено

**Файл:** `supabase/functions/send-reply/index.ts`

Строка 51-52 -- изменить URL и метод:

```text
// Было:
fetch("https://feedbacks-api.wildberries.ru/api/v1/feedbacks", {
  method: "PATCH",
  ...
  body: JSON.stringify({ id: review.wb_id, text: textToSend }),
})

// Станет:
fetch("https://feedbacks-api.wildberries.ru/api/v1/feedbacks/answer", {
  method: "POST",
  ...
  body: JSON.stringify({ id: review.wb_id, text: textToSend }),
})
```

Также нужно проверить `sync-reviews`, если в нём есть автоотправка через тот же неправильный URL -- и исправить его аналогично.

## Затрагиваемые файлы

| Файл | Изменение |
|------|-----------|
| `supabase/functions/send-reply/index.ts` | Исправить URL на `/api/v1/feedbacks/answer` и метод на `POST` |
| `supabase/functions/sync-reviews/index.ts` | Проверить и исправить URL автоотправки, если он тоже неправильный |

## Ожидаемый результат

После исправления ответы на отзывы будут успешно отправляться в Wildberries.

