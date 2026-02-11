
# Разделение моделей ИИ по рейтингу отзыва

## Суть изменения

В edge function `generate-reply` выбор модели будет зависеть от рейтинга отзыва:

- **4-5 звёзд** → `google/gemini-2.5-flash-lite` (быстрая, дешёвая — для простых положительных ответов)
- **1-3 звезды** → `openai/gpt-5.2` (мощная модель — для грамотной обработки негатива)

## Что изменится

**Файл**: `supabase/functions/generate-reply/index.ts`

Одно изменение на строке 163 — вместо захардкоженной модели `google/gemini-2.5-flash`, динамический выбор:

```typescript
const model = review.rating >= 4
  ? "google/gemini-2.5-flash-lite"
  : "openai/gpt-5.2";
```

Также добавим лог для отладки:
```typescript
console.log(`[generate-reply] Rating ${review.rating} → model: ${model}`);
```

## Технические детали

- Изменяется 1 файл: `supabase/functions/generate-reply/index.ts`
- Строка 163: `model: "google/gemini-2.5-flash"` → `model: model`
- Переменная `model` вычисляется перед вызовом API на основе `review.rating`
- OpenRouter поддерживает обе модели, менять провайдера не нужно
- Остальная логика (промпт, рекомендации, определение отказа) не затрагивается
