

# Переключение AI-аналитика на Lovable AI

## Проблема

Функция `ai-assistant` обращается к OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`), а на аккаунте OpenRouter закончились кредиты — отсюда ошибка 402 "Необходимо пополнить баланс AI-кредитов".

## Решение

Переключить функцию на Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`), который уже доступен в проекте через ключ `LOVABLE_API_KEY`. Модель `google/gemini-2.5-flash` поддерживается.

## Что изменится

### Файл: `supabase/functions/ai-assistant/index.ts`

1. **URL API**: Заменить `https://openrouter.ai/api/v1/chat/completions` на `https://ai.gateway.lovable.dev/v1/chat/completions`
2. **Ключ авторизации**: Заменить `OPENROUTER_API_KEY` на `LOVABLE_API_KEY`
3. Всё остальное (логика RAG, стриминг, обработка ошибок) остаётся без изменений

### Конкретные изменения в коде

Строка 167 -- заменить:
```
OPENROUTER_API_KEY -> LOVABLE_API_KEY
```

Строки 246-249 -- заменить URL и заголовок:
```
"https://openrouter.ai/api/v1/chat/completions" -> "https://ai.gateway.lovable.dev/v1/chat/completions"
Authorization: Bearer OPENROUTER_API_KEY -> Bearer LOVABLE_API_KEY
```

### Также стоит проверить

Нужно проверить, использует ли `generate-reply` тоже OpenRouter -- если да, его тоже стоит переключить, чтобы избежать аналогичной проблемы при генерации ответов на отзывы.

## Результат

- AI-аналитик начнёт работать без ошибок
- Не нужно пополнять баланс OpenRouter
- Модель остаётся той же (google/gemini-2.5-flash)
