
# Экспорт данных в CSV

## Что будет сделано

Кнопка "Экспорт данных" в диалоге настроек, которая позволяет скачать все данные (отзывы, чаты, рекомендации, настройки кабинета) в виде CSV-файлов, упакованных в один ZIP-архив, или по отдельности через выпадающее меню.

## Реализация

### Новый файл: `src/lib/exportCsv.ts`

Утилита для конвертации массива объектов в CSV-строку и скачивания файла через `Blob` + `URL.createObjectURL`. Функции:
- `objectsToCsv(data: Record<string, any>[])` -- конвертация в CSV с экранированием
- `downloadCsv(filename: string, csvContent: string)` -- триггер скачивания через скрытый `<a>`

### Новый файл: `src/hooks/useExportData.ts`

Хук, который:
1. Загружает данные из базы (reviews, chats, chat_messages, product_recommendations, настройки кабинета) через Supabase-клиент
2. Формирует CSV для каждой таблицы
3. Скачивает каждый файл по отдельности (reviews.csv, chats.csv, chat_messages.csv, recommendations.csv, settings.csv)

### Изменения в `src/components/SettingsDialog.tsx`

Добавить секцию "Экспорт данных" в конец диалога (перед кнопками "Отмена"/"Сохранить"):
- Кнопка "Скачать все данные (CSV)" с иконкой `Download`
- При нажатии вызывается функция экспорта, последовательно скачиваются 5 CSV-файлов
- Индикатор загрузки (Loader2) во время подготовки данных

## Состав экспортируемых данных

| Файл | Таблица | Ключевые поля |
|---|---|---|
| reviews.csv | reviews | wb_id, rating, author_name, text, pros, cons, product_name, product_article, status, ai_draft, sent_answer, created_date |
| chats.csv | chats | chat_id, client_name, product_name, last_message_text, last_message_at, is_read |
| chat_messages.csv | chat_messages | chat_id, sender, text, sent_at |
| recommendations.csv | product_recommendations | source_article, target_article, target_name |
| settings.csv | wb_cabinets | name, brand_name, ai_prompt_template, reply_modes |

## Технические детали

- Данные загружаются напрямую из базы (не из кэша React Query), чтобы гарантировать полноту
- Лимит Supabase в 1000 строк обходится пагинацией (range-запросы по 1000)
- CSV формируется с BOM-меткой (`\uFEFF`) для корректного отображения кириллицы в Excel
- Никаких новых зависимостей не требуется
