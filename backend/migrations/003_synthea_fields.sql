ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medication_code text;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medication_name text;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispenses numeric(12,2);

CREATE TABLE IF NOT EXISTS village_condition_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village text NOT NULL,
  district text NOT NULL,
  condition_code text NOT NULL,
  condition_name text NOT NULL,
  period_start date NOT NULL,
  case_count integer NOT NULL CHECK (case_count >= 5),
  data_source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, village, district, condition_code, period_start)
);
