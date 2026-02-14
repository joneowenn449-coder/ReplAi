

# Исправление зависания при проверке API-ключа

## Проблема

Когда вы нажимаете "Проверить подключение", функция `validate-api-key` вызывает `fetch-archive` (импорт архива отзывов) **синхронно** и ждёт, пока загрузятся ВСЕ архивные отзывы с WB API. Если отзывов много — это занимает минуты, и кнопка остаётся в состоянии "Проверка..." без обратной связи.

## Решение

Сделать вызов `fetch-archive` **асинхронным** (fire-and-forget): функция `validate-api-key` отправит запрос на импорт архива, но **не будет ждать его завершения**. Пользователь сразу увидит результат проверки ключа, а архив загрузится в фоне.

## Что изменится

### 1. Edge Function `validate-api-key/index.ts`

Заменить синхронный `await fetch(...)` на fire-and-forget вызов:
- Отправлять запрос к `fetch-archive` без `await` на ответ
- Сразу возвращать `{ valid: true, archive_importing: true }` пользователю
- Добавить таймаут на случай зависания

### 2. Frontend: уведомление об импорте

В хуке `useValidateApiKey` (в `useReviews.ts`):
- Обработать новое поле `archive_importing` (вместо `archive_imported`)
- Показать toast "Архив отзывов загружается в фоне" вместо "Архив загружен"

## Технические детали

Изменение в `validate-api-key/index.ts` (блок ~строки 119-146):

```typescript
// Вместо:
const archiveResp = await fetch(...);
const archiveData = await archiveResp.json();
archiveImported = archiveResp.ok && archiveData?.success;

// Будет:
// Fire-and-forget — не ждём ответа
fetch(`${SUPABASE_URL}/functions/v1/fetch-archive`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ user_id: userId, cabinet_id }),
}).catch(err => console.error("Archive trigger failed:", err));
archiveImported = true; // сигнал что импорт запущен
```

Изменение в `useReviews.ts` (`onSuccess`):

```typescript
if (data?.archive_imported) {
  toast.info("Архив отзывов загружается в фоне. Это может занять несколько минут.", {
    duration: 7000,
  });
}
```

### Затрагиваемые файлы

- `supabase/functions/validate-api-key/index.ts` — убираем `await` на fetch-archive
- `src/hooks/useReviews.ts` — обновляем toast-сообщение

