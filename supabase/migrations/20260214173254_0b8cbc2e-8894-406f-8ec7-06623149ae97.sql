
ALTER TABLE product_recommendations
  ADD COLUMN cabinet_id UUID REFERENCES wb_cabinets(id);

-- Backfill existing rows with active cabinet
UPDATE product_recommendations pr
SET cabinet_id = (
  SELECT id FROM wb_cabinets
  WHERE user_id = pr.user_id AND is_active = true
  LIMIT 1
);

-- For any remaining nulls, use any cabinet of the user
UPDATE product_recommendations pr
SET cabinet_id = (
  SELECT id FROM wb_cabinets
  WHERE user_id = pr.user_id
  LIMIT 1
)
WHERE pr.cabinet_id IS NULL;

ALTER TABLE product_recommendations
  ALTER COLUMN cabinet_id SET NOT NULL;

-- Update unique constraint
ALTER TABLE product_recommendations
  DROP CONSTRAINT IF EXISTS product_recommendations_source_article_target_article_user__key;

ALTER TABLE product_recommendations
  ADD CONSTRAINT product_recommendations_source_target_cabinet_key
  UNIQUE (source_article, target_article, cabinet_id);
