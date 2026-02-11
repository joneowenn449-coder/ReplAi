

# Переход с Lovable AI на OpenRouter

## Что меняется

Три backend-функции используют Lovable AI Gateway — все переводим на OpenRouter:

1. **generate-reply** — генерация ответа на отзыв (по кнопке)
2. **sync-reviews** — автоматическая генерация ответов при синхронизации
3. **ai-assistant** — AI аналитик (чат со стримингом)

## Изменения в каждой функции

Во всех трёх файлах одинаковая замена:

| Было | Станет |
|------|--------|
| `LOVABLE_API_KEY` | `OPENROUTER_API_KEY` |
| `https://ai.gateway.lovable.dev/v1/chat/completions` | `https://openrouter.ai/api/v1/chat/completions` |
| `model: "google/gemini-2.5-flash"` | `model: "google/gemini-2.5-flash"` (модель та же, OpenRouter поддерживает) |

## Необходимый секрет

Перед внесением изменений нужно добавить секрет `OPENROUTER_API_KEY` — API-ключ от OpenRouter. Без него функции не заработают.

## Технические детали

### 1. `supabase/functions/generate-reply/index.ts`
- Строка 30: `LOVABLE_API_KEY` -> `OPENROUTER_API_KEY`
- Строка 34: проверка ключа
- Строка 156: URL `https://openrouter.ai/api/v1/chat/completions`
- Строка 159: `Authorization: Bearer ${OPENROUTER_API_KEY}`

### 2. `supabase/functions/sync-reviews/index.ts`
- Строка 403: `LOVABLE_API_KEY` -> `OPENROUTER_API_KEY`
- Строка 407: проверка ключа
- Строка 102: URL `https://openrouter.ai/api/v1/chat/completions`
- Строка 105: `Authorization: Bearer ${OPENROUTER_API_KEY}`
- Строки 437, 464: передача переменной в `processUserReviews`

### 3. `supabase/functions/ai-assistant/index.ts`
- Строка 233: `LOVABLE_API_KEY` -> `OPENROUTER_API_KEY`
- Строка 234: проверка ключа
- Строка 427: URL `https://openrouter.ai/api/v1/chat/completions`
- Строка 431: `Authorization: Bearer ${OPENROUTER_API_KEY}`

Модель `google/gemini-2.5-flash` остаётся без изменений — OpenRouter поддерживает эту модель. При желании можно будет сменить на любую другую модель OpenRouter.
