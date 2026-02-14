

# Привязка рекомендаций к кабинетам

## Проблема

Таблица `product_recommendations` не содержит поля `cabinet_id`. Артикулы товаров (`useProductArticles`) также загружаются из `reviews` без фильтрации по кабинету. В результате при переключении кабинета пользователь видит рекомендации и артикулы из всех кабинетов.

## Решение

Добавить `cabinet_id` в таблицу `product_recommendations` и фильтровать все запросы (артикулы, рекомендации, сводку) по активному кабинету.

## Что изменится

### 1. Миграция базы данных

- Добавить колонку `cabinet_id UUID REFERENCES wb_cabinets(id)` в `product_recommendations`
- Обновить уникальное ограничение: `(source_article, target_article, cabinet_id)` вместо `(source_article, target_article, user_id)`
- Обновить RLS-политики для учета `cabinet_id`

### 2. Хук `useRecommendations.ts`

- `useProductArticles()` -- принимает `cabinetId`, фильтрует reviews по `cabinet_id`
- `useRecommendations()` -- добавить фильтр `.eq("cabinet_id", cabinetId)`
- `useAllRecommendationsSummary()` -- добавить фильтр по `cabinet_id`
- `useAddRecommendation()` -- передавать `cabinet_id` при вставке
- Все `queryKey` включают `cabinetId` для корректной инвалидации кеша

### 3. Компонент `RecommendationsSection.tsx`

- Получать `activeCabinet` из хука `useActiveCabinet()`
- Передавать `cabinetId` во все хуки рекомендаций

### 4. Edge Function `generate-reply`

- Обновить запрос рекомендаций, добавив фильтр по `cabinet_id`

## Технические детали

### Миграция

```sql
ALTER TABLE product_recommendations
  ADD COLUMN cabinet_id UUID REFERENCES wb_cabinets(id);

-- Проставить cabinet_id для существующих записей (из активного кабинета пользователя)
UPDATE product_recommendations pr
SET cabinet_id = (
  SELECT id FROM wb_cabinets
  WHERE user_id = pr.user_id AND is_active = true
  LIMIT 1
);

ALTER TABLE product_recommendations
  ALTER COLUMN cabinet_id SET NOT NULL;

-- Обновить уникальное ограничение
ALTER TABLE product_recommendations
  DROP CONSTRAINT IF EXISTS product_recommendations_source_article_target_article_user__key;

ALTER TABLE product_recommendations
  ADD CONSTRAINT product_recommendations_source_target_cabinet_key
  UNIQUE (source_article, target_article, cabinet_id);
```

### Хуки (основные изменения)

```typescript
// useProductArticles принимает cabinetId
export function useProductArticles(cabinetId: string | undefined) {
  return useQuery({
    queryKey: ["product-articles", cabinetId],
    queryFn: async () => {
      let query = supabase.from("reviews").select("product_article, product_name");
      if (cabinetId) query = query.eq("cabinet_id", cabinetId);
      // ...
    },
    enabled: !!cabinetId,
  });
}

// useRecommendations фильтрует по cabinet_id
export function useRecommendations(sourceArticle: string | null, cabinetId: string | undefined) {
  // .eq("cabinet_id", cabinetId)
}

// useAddRecommendation передает cabinet_id
// insert({ ..., cabinet_id: cabinetId })
```

### Затрагиваемые файлы

- Миграция SQL -- добавление `cabinet_id` в `product_recommendations`
- `src/hooks/useRecommendations.ts` -- фильтрация по кабинету во всех хуках
- `src/components/RecommendationsSection.tsx` -- передача `cabinetId` в хуки
- `supabase/functions/generate-reply/index.ts` -- фильтр рекомендаций по `cabinet_id`
