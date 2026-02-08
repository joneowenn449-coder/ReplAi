

# Обновление Edge Functions для мультиарендности

## Проблема

После добавления аутентификации и `user_id` во все таблицы, Edge Functions остались без изменений. Они:
- Не передают `user_id` при вставке данных
- Не фильтруют по `user_id` при чтении
- Не извлекают идентификатор пользователя из токена авторизации

В результате: 1052 существующих отзыва имеют `user_id = null`, а RLS-политики требуют `user_id = auth.uid()` -- поэтому пользователь видит пустую базу.

Дополнительно: триггер импорта архива при привязке API-ключа не сработал, потому что `validate-api-key` считает все отзывы (через service role), видит 1052 и решает, что архив уже загружен.

## Что нужно сделать

### 1. Миграция: привязать существующие данные к пользователю

SQL-миграция для привязки всех "бесхозных" строк (с `user_id = null`) к текущему пользователю и удаления дубликата в settings.

```text
UPDATE reviews SET user_id = '<user_id>' WHERE user_id IS NULL;
UPDATE chats SET user_id = '<user_id>' WHERE user_id IS NULL;
UPDATE chat_messages SET user_id = '<user_id>' WHERE user_id IS NULL;
UPDATE product_recommendations SET user_id = '<user_id>' WHERE user_id IS NULL;
DELETE FROM settings WHERE user_id IS NULL;  -- удалить старую строку-дубликат
```

### 2. Обновить все Edge Functions для поддержки user_id

Каждая функция должна:
- Извлекать `user_id` из JWT-токена авторизации
- Фильтровать `settings` по `user_id` при получении API-ключа
- Передавать `user_id` при вставке новых записей
- Фильтровать запросы по `user_id`

#### Общий паттерн авторизации (для всех функций):

```text
// Извлечь user_id из токена авторизации
const authHeader = req.headers.get("Authorization");
const token = authHeader?.replace("Bearer ", "");
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) throw new Error("Unauthorized");
const userId = user.id;

// Далее: фильтрация по userId
const { data: settings } = await supabase
  .from("settings")
  .select("*")
  .eq("user_id", userId)
  .maybeSingle();
```

#### Затрагиваемые функции (7 штук):

- **validate-api-key** -- фильтровать settings и reviews по user_id, передавать user_id при вызове fetch-archive
- **fetch-archive** -- принимать user_id в body, вставлять отзывы с user_id
- **sync-reviews** -- извлекать user_id из токена (или обрабатывать все user_id для cron), фильтровать settings/reviews/recommendations по user_id, вставлять с user_id
- **sync-chats** -- аналогично: фильтровать settings по user_id, вставлять chats/chat_messages с user_id
- **send-reply** -- извлекать user_id из токена, фильтровать settings/reviews по user_id
- **generate-reply** -- извлекать user_id из токена, фильтровать reviews/settings/recommendations по user_id
- **send-chat-message** -- извлекать user_id из токена, фильтровать settings/chats по user_id, вставлять messages с user_id
- **archive-old-reviews** -- cron-задача, должна обрабатывать все пользовательские данные (без фильтрации)

### 3. Особая обработка cron-задач

Функции `sync-reviews` и `archive-old-reviews` вызываются по расписанию (pg_cron), без пользовательского токена. Для них нужна логика обхода всех пользователей:

```text
// Если нет токена (cron) -- обработать ВСЕХ пользователей
const { data: allSettings } = await supabase
  .from("settings")
  .select("*")
  .not("wb_api_key", "is", null);

for (const userSettings of allSettings) {
  // обработать каждого пользователя отдельно
}
```

### 4. Логика validate-api-key: исправить проверку первого запуска

Текущая проверка считает ВСЕ отзывы. Нужно фильтровать по user_id:

```text
const { count } = await supabase
  .from("reviews")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId);

if (count === null || count === 0) {
  // Первый запуск -- запустить импорт архива
}
```

## Порядок реализации

1. SQL-миграция: привязать данные к пользователю, удалить дубликат settings
2. Обновить validate-api-key (+ передача user_id в fetch-archive)
3. Обновить fetch-archive (принимать user_id)
4. Обновить sync-reviews (поддержка cron + user_id)
5. Обновить sync-chats (аналогично)
6. Обновить send-reply, generate-reply, send-chat-message
7. Обновить archive-old-reviews (обработка всех пользователей)

## Затрагиваемые файлы

- Новая SQL-миграция (привязка данных)
- `supabase/functions/validate-api-key/index.ts`
- `supabase/functions/fetch-archive/index.ts`
- `supabase/functions/sync-reviews/index.ts`
- `supabase/functions/sync-chats/index.ts`
- `supabase/functions/send-reply/index.ts`
- `supabase/functions/generate-reply/index.ts`
- `supabase/functions/send-chat-message/index.ts`
- `supabase/functions/archive-old-reviews/index.ts`

