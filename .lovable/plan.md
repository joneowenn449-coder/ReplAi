

# Анализ фото отзывов через Vision-модель

## Суть изменения

Когда покупатель прикладывает фото к отзыву, ИИ будет не просто знать что "есть фото", а **реально видеть и анализировать** эти фотографии. Это позволит давать более точные и релевантные ответы.

## Как это работает

Сейчас фото передаются как текст: `[Покупатель приложил 3 фотографии]`. ИИ не видит содержимое фото.

После изменения: фото будут отправляться как изображения в формате OpenAI Vision API (поддерживается OpenRouter). ИИ увидит, что на фото, и сможет упомянуть детали в ответе.

## Выбор модели

- **Отзыв с фото** → `google/gemini-2.5-flash` (хорошая vision-модель, баланс цены и качества)
- **Отзыв без фото, 4-5 звёзд** → `google/gemini-2.5-flash-lite` (как сейчас)
- **Отзыв без фото, 1-3 звезды** → `openai/gpt-5.2` (как сейчас)

## Что изменится

**Файл**: `supabase/functions/generate-reply/index.ts`

### 1. Формирование сообщения с изображениями

Вместо простой текстовой строки `userMessage`, при наличии фото формируем массив `content` с типами `text` и `image_url`:

```typescript
// Если есть фото — формируем multimodal content
const contentParts: any[] = [{ type: "text", text: userMessage }];

if (photoLinks.length > 0) {
  // Берём miniSize для экономии (до 5 фото максимум)
  const photosToSend = photoLinks.slice(0, 5);
  for (const photo of photosToSend) {
    const url = photo.miniSize || photo.fullSize;
    if (url) {
      contentParts.push({
        type: "image_url",
        image_url: { url }
      });
    }
  }
}
```

### 2. Обновление выбора модели

```typescript
const hasPhotos = photoLinks.length > 0;
const model = hasPhotos
  ? "google/gemini-2.5-flash"         // vision-модель для фото
  : review.rating >= 4
    ? "google/gemini-2.5-flash-lite"   // лёгкая для позитива
    : "openai/gpt-5.2";               // мощная для негатива
```

### 3. Обновление формата сообщения

```typescript
messages: [
  { role: "system", content: promptTemplate },
  hasPhotos
    ? { role: "user", content: contentParts }   // multimodal
    : { role: "user", content: userMessage },    // text only
],
```

### 4. Обновление инструкции о фото в промпте

Когда фото прикреплены и отправляются на анализ, текст `attachmentInfo` изменится:

```
[Покупатель приложил N фотографий к отзыву. Фотографии прикреплены ниже — проанализируй их и учти в ответе, если это уместно.]
```

## Технические детали

- Изменяется 1 файл: `supabase/functions/generate-reply/index.ts`
- Фото берутся из `photo_links` (JSONB массив объектов `{fullSize, miniSize}`)
- Используем `miniSize` для экономии токенов (фото достаточного качества для анализа)
- Ограничение: максимум 5 фото за запрос (чтобы не раздувать стоимость)
- OpenRouter поддерживает Vision API формат для Gemini моделей
- Без фото — поведение остаётся прежним (flash-lite / gpt-5.2)

