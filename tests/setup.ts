import { Pool } from 'pg';

export const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'que_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || '',
};

export async function setupTestDatabase(): Promise<Pool> {
  const pool = new Pool(TEST_DB_CONFIG);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS que_jobs (
      priority    smallint    NOT NULL DEFAULT 100,
      run_at      timestamptz NOT NULL DEFAULT now(),
      job_id      bigserial   NOT NULL,
      job_class   text        NOT NULL,
      args        json        NOT NULL DEFAULT '[]'::json,
      error_count integer     NOT NULL DEFAULT 0,
      last_error  text,
      queue       text        NOT NULL DEFAULT '',
      PRIMARY KEY (queue, priority, run_at, job_id)
    )
  `);

  return pool;
}

export async function cleanupTestDatabase(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE que_jobs');
  await pool.end();
}