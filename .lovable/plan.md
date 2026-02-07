
# Автоматическая синхронизация чатов каждые 5 минут

## Что будет сделано

Добавить cron-задачу в базу данных, которая каждые 5 минут автоматически вызывает Edge Function `sync-chats`. Это полностью аналогично уже работающей автосинхронизации отзывов.

## Как это работает

Расширения `pg_cron` и `pg_net` уже установлены в проекте. Нужно только зарегистрировать новое расписание, которое будет каждые 5 минут отправлять HTTP-запрос к функции `sync-chats`.

## Изменения

### SQL-запрос для создания cron-задачи

Выполнить SQL-запрос напрямую (не через миграцию, так как он содержит URL и ключ проекта):

```sql
SELECT cron.schedule(
  'sync-chats-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yzlrebnfslyvqscjmmwh.supabase.co/functions/v1/sync-chats',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHJlYm5mc2x5dnFzY2ptbXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjgwMTAsImV4cCI6MjA4NTk0NDAxMH0.Ys-lY7wZ9EN82hkmzZXwcrREXHlmUzL4wxHXPRLM-6o"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
```

Это единственное изменение -- никаких файлов создавать или менять не нужно.

## Технические детали

- Расписание: `*/5 * * * *` (каждые 5 минут)
- Имя задачи: `sync-chats-every-5-min`
- Используются уже установленные расширения `pg_cron` и `pg_net`
- Запрос выполняется напрямую через SQL (аналогично sync-reviews), а не через миграцию
