
# Интеграция чата с покупателями Wildberries

## Что даёт API

Wildberries предоставляет полный API для работы с чатами покупателей:
- Получение списка чатов и истории сообщений
- Отправка текстовых сообщений и файлов (JPEG, PDF, PNG)
- Скачивание вложений из сообщений покупателей

Базовый URL: `buyer-chat-api.wildberries.ru` (отличается от feedbacks-api)

## Важный момент: токен доступа

Для чатов нужен токен с правами категории **"Buyers chat" (9)**, а для отзывов -- категория **"Feedbacks and Questions" (7)**. Это могут быть разные токены. Если текущий ключ не имеет доступа к чатам, понадобится пересоздать токен с нужными правами.

## План реализации

### 1. База данных -- 2 новые таблицы

**Таблица `chats`** -- список чатов:
- `id` (uuid, PK)
- `chat_id` (text, unique) -- ID чата из WB API
- `reply_sign` (text) -- подпись для ответа
- `client_name` (text) -- имя покупателя
- `product_nm_id` (integer) -- артикул товара
- `product_name` (text) -- название товара (если доступно)
- `last_message_text` (text) -- текст последнего сообщения
- `last_message_at` (timestamptz) -- время последнего сообщения
- `is_read` (boolean, default false) -- прочитан ли чат
- `created_at`, `updated_at` (timestamptz)

**Таблица `chat_messages`** -- сообщения в чатах:
- `id` (uuid, PK)
- `chat_id` (text, FK -> chats.chat_id) -- ссылка на чат
- `event_id` (text, unique) -- ID события из WB API
- `sender` (text) -- "client" или "seller"
- `text` (text) -- текст сообщения
- `attachments` (jsonb) -- вложения (images, files)
- `sent_at` (timestamptz) -- время отправки
- `created_at` (timestamptz)

RLS-политики: аналогичные существующим для reviews/settings (SELECT/INSERT/UPDATE для anon).

### 2. Edge Function: `sync-chats`

Новая функция для синхронизации чатов:

1. Получить список чатов через `GET /api/v1/seller/chats`
2. Сохранить/обновить записи в таблице `chats`
3. Получить события (сообщения) через `GET /api/v1/seller/events` с пагинацией через `next`
4. Сохранить новые сообщения в `chat_messages`
5. Обновить `last_message_text` и `last_message_at` в таблице `chats`

Задержки между запросами: 1 секунда (лимит 10 запросов за 10 сек).

### 3. Edge Function: `send-chat-message`

Функция для отправки сообщения продавца:

1. Принимает `chat_id` и `message` (текст)
2. Получает `reply_sign` из таблицы `chats`
3. Отправляет через `POST /api/v1/seller/message` (multipart/form-data)
4. Сохраняет отправленное сообщение в `chat_messages`

### 4. Frontend -- вкладка "Чаты"

Добавить новую вкладку в навигации (рядом с "Отзывы" и "AI"):

**Левая панель** -- список чатов:
- Имя покупателя
- Последнее сообщение (превью)
- Время последнего сообщения
- Индикатор непрочитанных

**Правая панель** -- история сообщения выбранного чата:
- Сообщения покупателя (слева, серый фон)
- Сообщения продавца (справа, цветной фон)
- Вложения (превью картинок, ссылки на файлы)
- Поле ввода и кнопка отправки внизу

**Новая страница** `src/pages/Chats.tsx` или секция внутри `Index.tsx` по переключению вкладки.

### 5. Хуки

**`src/hooks/useChats.ts`**:
- `useChats()` -- список чатов из БД
- `useChatMessages(chatId)` -- сообщения конкретного чата
- `useSyncChats()` -- мутация для синхронизации
- `useSendChatMessage()` -- мутация для отправки сообщения

### 6. Периодическая синхронизация (опционально)

Добавить cron-задачу для `sync-chats` аналогично `sync-reviews` (каждые 5 минут) или синхронизировать вручную по кнопке.

## Технические детали

### API эндпоинты WB Buyers Chat

```text
Base URL: https://buyer-chat-api.wildberries.ru

GET  /api/v1/seller/chats        -- список чатов
GET  /api/v1/seller/events?next=  -- события/сообщения (пагинация)
POST /api/v1/seller/message      -- отправка (multipart/form-data: replySign, message, file[])
GET  /api/v1/seller/download/{id} -- скачивание файла
```

### Лимиты
- 10 запросов за 10 секунд (1 запрос в секунду)
- Сообщение до 1000 символов
- Файлы: JPEG/PDF/PNG, до 5 МБ каждый, суммарно до 30 МБ

### Файлы для создания/изменения

| Файл | Действие |
|------|----------|
| Миграция БД (chats, chat_messages) | Создать |
| `supabase/functions/sync-chats/index.ts` | Создать |
| `supabase/functions/send-chat-message/index.ts` | Создать |
| `src/hooks/useChats.ts` | Создать |
| `src/components/ChatList.tsx` | Создать |
| `src/components/ChatWindow.tsx` | Создать |
| `src/components/ChatMessage.tsx` | Создать |
| `src/pages/Index.tsx` | Изменить (добавить вкладку чатов) |
| `src/components/NavTabs.tsx` | Изменить (добавить таб "Чаты") |
| `supabase/config.toml` | Изменить (verify_jwt для новых функций) |
