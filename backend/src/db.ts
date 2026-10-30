import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_SIZE ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

export async function audit(input: {
  actorUserId?: string | null;
  patientId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  purpose?: string | null;
  outcome?: string;
  metadata?: Record<string, unknown>;
}) {
  await pool.query(
    `INSERT INTO audit_logs(actor_user_id, patient_id, action, resource_type, resource_id, purpose, outcome, metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [input.actorUserId ?? null, input.patientId ?? null, input.action, input.resourceType,
      input.resourceId ?? null, input.purpose ?? null, input.outcome ?? 'success', input.metadata ?? {}],
  );
}
