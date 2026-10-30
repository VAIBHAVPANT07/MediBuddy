CREATE INDEX IF NOT EXISTS appointments_patient_schedule_idx ON appointments(patient_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS appointments_doctor_schedule_idx ON appointments(doctor_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS appointments_status_schedule_idx ON appointments(status, scheduled_at);
