CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE app_role AS ENUM ('patient', 'doctor', 'admin', 'seller');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appointment_status AS ENUM ('requested', 'approved', 'rescheduled', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE,
  email text UNIQUE,
  password_hash text,
  source_id text,
  data_source text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS roles (
  id smallserial PRIMARY KEY,
  name app_role NOT NULL UNIQUE
);
INSERT INTO roles(name) VALUES ('patient'), ('doctor'), ('admin'), ('seller') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id smallint NOT NULL REFERENCES roles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_type text NOT NULL DEFAULT 'health_center',
  village text,
  district text,
  state text NOT NULL DEFAULT 'Uttarakhand',
  source_id text,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  given_name text,
  family_name text,
  birth_date date,
  sex text,
  village text,
  district text,
  source_id text,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  given_name text,
  family_name text,
  specialty text,
  source_id text,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS medicine_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid REFERENCES doctors(id),
  organization_id uuid REFERENCES organizations(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz,
  status appointment_status NOT NULL DEFAULT 'requested',
  reason text,
  version integer NOT NULL DEFAULT 1,
  source_id text,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid REFERENCES doctors(id),
  appointment_id uuid REFERENCES appointments(id),
  organization_id uuid REFERENCES organizations(id),
  occurred_at timestamptz NOT NULL,
  summary text,
  source_id text,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid REFERENCES doctors(id),
  encounter_id uuid REFERENCES encounters(id),
  seller_id uuid REFERENCES medicine_sellers(id),
  instructions text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  source_id text,
  data_source text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  organization_id uuid REFERENCES organizations(id),
  vaccine_code text,
  vaccine_name text,
  administered_at timestamptz,
  source_id text,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES medicine_sellers(id),
  name text NOT NULL,
  category text,
  unit_price numeric(12,2) NOT NULL CHECK(unit_price >= 0),
  source_id text,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source, source_id)
);
CREATE TABLE IF NOT EXISTS stock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL REFERENCES medicines(id),
  quantity_delta integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  idempotency_key uuid UNIQUE,
  data_source text
);
CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  grantee_user_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  data_source text,
  CHECK(expires_at IS NULL OR expires_at > granted_at)
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  purpose text,
  outcome text NOT NULL DEFAULT 'success',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_patient_created_idx ON audit_logs(patient_id, created_at DESC);
CREATE TABLE IF NOT EXISTS sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  client_id uuid NOT NULL,
  idempotency_key uuid NOT NULL UNIQUE,
  operation text NOT NULL,
  record_type text NOT NULL,
  record_version integer NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','applied','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS triage_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  version text NOT NULL,
  rule_definition jsonb NOT NULL,
  guideline_source text,
  review_status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(review_status IN ('PENDING_REVIEW','APPROVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rule_key, version)
);
CREATE TABLE IF NOT EXISTS model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  version text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(model_name, version)
);
CREATE TABLE IF NOT EXISTS triage_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id),
  rule_id uuid REFERENCES triage_rules(id),
  model_version_id uuid REFERENCES model_versions(id),
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  urgency text NOT NULL CHECK(urgency IN ('EMERGENCY','URGENT_CLINICIAN','ROUTINE_VISIT','SELF_CARE')),
  disclaimer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DO $$ BEGIN
  CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER stock_entries_updated_at BEFORE UPDATE ON stock_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER sync_queue_updated_at BEFORE UPDATE ON sync_queue FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
