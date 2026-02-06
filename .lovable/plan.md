

# Исправление проверки API-ключа

## Проблема

При проверке API-ключа WB API возвращает ошибку 400 с текстом "Плохой формат skip". Это происходит потому, что тестовый запрос в функции `validate-api-key` не содержит обязательный параметр `skip`:

```text
Текущий URL:  .../feedbacks?isAnswered=false&take=1
Нужный URL:   .../feedbacks?isAnswered=false&take=1&skip=0
```

В функции `sync-reviews` параметр `skip=0` передается корректно, поэтому синхронизация работает.

## Исправление

Одно изменение в одном файле:

**`supabase/functions/validate-api-key/index.ts`** (строка 32):

Добавить `&skip=0` к URL тестового запроса:

```text
До:    ...feedbacks?isAnswered=false&take=1
После: ...feedbacks?isAnswered=false&take=1&skip=0
```

После этого функция будет передеплоена автоматически, и проверка ключа заработает.
