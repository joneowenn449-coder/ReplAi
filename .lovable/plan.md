

# Добавление полей "Плюсы" и "Недостатки" в отзывы

## Проблема

API Wildberries возвращает три текстовых поля в отзыве: `text` (комментарий), `pros` (плюсы) и `cons` (недостатки). Сейчас в базу сохраняется и отображается только `text`, а два других поля полностью игнорируются.

## Что будет сделано

### Шаг 1. Добавить колонки в базу данных

Создать миграцию для добавления двух новых колонок в таблицу `reviews`:

```
ALTER TABLE reviews ADD COLUMN pros TEXT DEFAULT NULL;
ALTER TABLE reviews ADD COLUMN cons TEXT DEFAULT NULL;
```

### Шаг 2. Обновить sync-reviews

**Файл:** `supabase/functions/sync-reviews/index.ts`

При сохранении нового отзыва добавить поля `pros` и `cons`:

```
// Было:
text: fb.text || null,

// Станет:
text: fb.text || null,
pros: fb.pros || null,
cons: fb.cons || null,
```

Также передавать все три поля в функцию `generateAIReply`, чтобы ИИ видел полный контент отзыва. Формат пользовательского сообщения изменится:

```
// Вместо просто review.text, будет составной текст:
Отзыв (4 из 5 звёзд) на товар "Название":

Комментарий: текст комментария

Плюсы: текст плюсов

Недостатки: текст недостатков
```

### Шаг 3. Обновить fetch-archive

**Файл:** `supabase/functions/fetch-archive/index.ts`

Аналогичное изменение -- добавить `pros` и `cons` при сохранении архивных отзывов.

### Шаг 4. Обновить generate-reply

**Файл:** `supabase/functions/generate-reply/index.ts`

Формировать полный текст отзыва из всех трёх полей при отправке запроса к ИИ:

```
// Составить полный текст из трёх полей:
let reviewContent = "";
if (review.text) reviewContent += `Комментарий: ${review.text}`;
if (review.pros) reviewContent += `\nПлюсы: ${review.pros}`;
if (review.cons) reviewContent += `\nНедостатки: ${review.cons}`;
if (!reviewContent) reviewContent = "(Без текста, только оценка)";
```

### Шаг 5. Обновить интерфейс Review

**Файл:** `src/hooks/useReviews.ts`

Добавить поля `pros` и `cons` в интерфейс `Review`:

```
export interface Review {
  ...
  text: string | null;
  pros: string | null;   // новое
  cons: string | null;   // новое
  ...
}
```

### Шаг 6. Обновить карточку отзыва

**Файл:** `src/components/ReviewCard.tsx`

Добавить пропсы `pros` и `cons` и отображать их с подписями:

```
// Вместо одного блока text -- три блока с подписями:

{text && (
  <div>
    <span className="text-xs font-medium text-muted-foreground">Комментарий:</span>
    <p className="text-sm">{text}</p>
  </div>
)}
{pros && (
  <div>
    <span className="text-xs font-medium text-green-600">Плюсы:</span>
    <p className="text-sm">{pros}</p>
  </div>
)}
{cons && (
  <div>
    <span className="text-xs font-medium text-red-500">Недостатки:</span>
    <p className="text-sm">{cons}</p>
  </div>
)}
```

### Шаг 7. Передать данные из Index.tsx

**Файл:** `src/pages/Index.tsx`

Передавать `pros` и `cons` в компонент `ReviewCard`.

## Затрагиваемые файлы

| Файл | Изменение |
|------|-----------|
| Миграция БД | Добавить колонки `pros` и `cons` |
| `supabase/functions/sync-reviews/index.ts` | Сохранять `pros`, `cons`; передавать полный текст в ИИ |
| `supabase/functions/fetch-archive/index.ts` | Сохранять `pros`, `cons` |
| `supabase/functions/generate-reply/index.ts` | Формировать полный текст из трёх полей |
| `src/hooks/useReviews.ts` | Добавить `pros`, `cons` в интерфейс |
| `src/components/ReviewCard.tsx` | Отображать три поля с подписями |
| `src/pages/Index.tsx` | Передавать `pros`, `cons` в ReviewCard |

## Важно

Уже загруженные отзывы в базе не содержат `pros` и `cons` (они будут `null`). Чтобы получить эти поля для существующих отзывов, нужно будет пересинхронизировать данные. Новые отзывы после обновления будут сохранять все три поля автоматически.
