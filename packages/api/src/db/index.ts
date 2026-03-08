import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'reportcast',
  password: process.env.DB_PASSWORD || 'reportcast_dev_password',
  database: process.env.DB_NAME || 'reportcast',
});

// Drizzle instance
export const db = drizzle(pool, { schema });

// Types
export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;
export type Report = typeof schema.reports.$inferSelect;
export type NewReport = typeof schema.reports.$inferInsert;
export type Payment = typeof schema.payments.$inferSelect;
export type NewPayment = typeof schema.payments.$inferInsert;
export type ApiKey = typeof schema.apiKeys.$inferSelect;
export type NewApiKey = typeof schema.apiKeys.$inferInsert;

// Health check
export async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: result.rows[0].now };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
}
