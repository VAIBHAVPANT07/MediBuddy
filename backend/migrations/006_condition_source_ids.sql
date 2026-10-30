ALTER TABLE village_condition_analytics ADD COLUMN IF NOT EXISTS source_id text;
CREATE UNIQUE INDEX IF NOT EXISTS village_condition_analytics_source_idx ON village_condition_analytics(data_source, source_id);
