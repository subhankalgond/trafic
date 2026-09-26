import { Pool, PoolClient, QueryResultRow } from 'pg';
import { env, isSupabase } from './env';

const needsSsl = isSupabase || process.env.DB_SSL === 'true';

export const pool = new Pool({
  connectionString: env.db.databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

/** Run a parameterized query. All queries must use placeholders to prevent SQL injection. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

/** Run a parameterized query and return the first row or null. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Run an INSERT/UPDATE/DELETE and return affected row count. */
export async function execute(sql: string, params: unknown[] = []): Promise<number> {
  const res = await pool.query(sql, params);
  return res.rowCount ?? 0;
}

/** Run a transaction with the given callback receiving the client. */
export async function withTransaction<T>(fn: (conn: PoolClient) => Promise<T>): Promise<T> {
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    const result = await fn(conn);
    await conn.query('COMMIT');
    return result;
  } catch (error) {
    await conn.query('ROLLBACK');
    throw error;
  } finally {
    conn.release();
  }
}
