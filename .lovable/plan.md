
# Добавление недостающих таблиц в экспорт CSV

## Что будет изменено

Файл `src/hooks/useExportData.ts` — расширяем экспорт тремя дополнительными таблицами:

| Файл | Таблица | Поля |
|---|---|---|
| wb_cabinets.csv | wb_cabinets | id, name, brand_name, wb_api_key, ai_prompt_template, reply_modes, is_active, last_sync_at |
| token_balances.csv | token_balances | user_id, balance, updated_at |
| profiles.csv | profiles | id, display_name, phone, created_at |

## Детали

- Текущий файл `settings.csv` экспортирует `wb_cabinets`, но без критичных полей (`id`, `wb_api_key`, `is_active`, `last_sync_at`). Он будет заменён на полный экспорт `wb_cabinets.csv` со всеми полями, включая API-ключи.
- Добавятся два новых файла: `token_balances.csv` и `profiles.csv`.
- Итого будет скачиваться 7 CSV-файлов вместо 5.

## Технические детали

Изменения только в одном файле: `src/hooks/useExportData.ts`.

- В `Promise.all` добавятся два новых вызова `fetchAllRows` для `token_balances` и `profiles`
- Запрос `wb_cabinets` будет расширен до полного набора колонок, включая `wb_api_key`
- Файл `settings.csv` переименуется в `wb_cabinets.csv` для ясности
