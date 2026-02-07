

# Переключение AI-ассистента на OpenRouter API

## Проблема

Сейчас edge-функция `ai-assistant` использует Lovable AI Gateway (`ai.gateway.lovable.dev`) и ключ `LOVABLE_API_KEY`. Нужно переключить на OpenRouter API, который уже используется в `generate-reply`.

## Изменения

### Файл: `supabase/functions/ai-assistant/index.ts`

Три точечных изменения:

1. **Ключ API** (строка 167-168): заменить `LOVABLE_API_KEY` на `OPENROUTER_API_KEY`
   - Было: `Deno.env.get("LOVABLE_API_KEY")`
   - Станет: `Deno.env.get("OPENROUTER_API_KEY")`

2. **URL API** (строка 246-247): заменить gateway на OpenRouter
   - Было: `https://ai.gateway.lovable.dev/v1/chat/completions`
   - Станет: `https://openrouter.ai/api/v1/chat/completions`

3. **Модель** (строка 255): заменить на ту же, что уже используется в `generate-reply`
   - Было: `google/gemini-3-flash-preview`
   - Станет: `google/gemini-2.5-flash`

Вся остальная логика (RAG-запросы в БД, системный промпт, SSE-стриминг, парсинг на фронтенде) останется без изменений -- OpenRouter поддерживает тот же формат SSE-ответов.

## Результат

- AI-ассистент будет работать через OpenRouter API с тем же ключом, что и генерация ответов
- Единый провайдер для всех AI-функций в проекте
