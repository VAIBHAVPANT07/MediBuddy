import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const migrationsPath = fileURLToPath(new URL('../migrations/', import.meta.url));
try {
  const files = (await readdir(migrationsPath)).filter((file) => /^\d+_[a-z0-9_]+\.sql$/.test(file)).sort();
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const existing = await client.query('SELECT version FROM schema_migrations WHERE version=$1', [version]);
      if (existing.rowCount) {
        console.log(`Migration ${file} already applied.`);
        continue;
      }
      const sql = await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [version]);
        await client.query('COMMIT');
        console.log(`Applied migration ${file}.`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally { client.release(); }
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally { await pool.end(); }
