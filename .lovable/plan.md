

# Исправление: рекомендации LUNERA привязаны к кабинету elinova

## Проблема

При миграции добавления `cabinet_id` в таблицу `product_recommendations` скрипт присвоил все записи активному на тот момент кабинету -- **elinova**. Но артикулы 471329594, 471329595, 722695947, 722695948 принадлежат кабинету **LUNERA**.

## Решение

Выполнить SQL-миграцию, которая переназначит существующие рекомендации на правильный кабинет. Логика: сопоставить `source_article` рекомендации с `product_article` в таблице `reviews`, чтобы определить, к какому кабинету на самом деле относятся эти артикулы.

## Техническая реализация

### SQL-миграция

```sql
-- Переназначить cabinet_id на основании того, в каком кабинете
-- реально существуют отзывы с этим артикулом
UPDATE product_recommendations pr
SET cabinet_id = (
  SELECT DISTINCT r.cabinet_id
  FROM reviews r
  WHERE r.product_article = pr.source_article
    AND r.user_id = pr.user_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM reviews r
  WHERE r.product_article = pr.source_article
    AND r.user_id = pr.user_id
    AND r.cabinet_id != pr.cabinet_id
);
```

Это найдет правильный кабинет по артикулам из таблицы отзывов и переназначит рекомендации.

### Затрагиваемые файлы

- SQL-миграция (исправление данных)
- Код не меняется -- хуки и компоненты уже корректно фильтруют по `cabinet_id`

