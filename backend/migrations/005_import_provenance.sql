ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS data_source text;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS source_id text;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_source_idx ON user_roles(data_source, source_id);
