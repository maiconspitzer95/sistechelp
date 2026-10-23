import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
  host: env.DB.host,
  port: env.DB.port,
  database: env.DB.database,
  user: env.DB.user,
  password: env.DB.password,
  ssl: env.DB.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente PostgreSQL:', err);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('SQL executado:', { text, duration, rows: res.rowCount });
  }
  return res;
}

export async function getClient() {
  return await pool.connect();
}
