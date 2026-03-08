import { Pool } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrationsIfNeeded() {
  const startTime = Date.now();
  
  console.log('🔍 Checking database migrations...');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'reportcast',
    password: process.env.DB_PASSWORD || 'reportcast_dev_password',
    database: process.env.DB_NAME || 'reportcast',
  });

  try {
    // Wait for database to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        await pool.query('SELECT 1');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error('Database not ready after 10 retries');
        }
        console.log(`⏳ Waiting for database... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('✅ Database connection established');

    // Check if migrations already applied
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) AS table_exists;
    `);

    if (checkResult.rows[0].table_exists) {
      console.log('⏭️  Migrations already applied, skipping...');
    } else {
      // Run migrations from SQL files
      const migrationsFolder = path.join(__dirname, '../../drizzle');
      
      console.log(`📂 Running SQL migrations from ${migrationsFolder}`);
      
      const schemaSql = readFileSync(path.join(migrationsFolder, '0000_initial_schema.sql'), 'utf-8');
      await pool.query(schemaSql);
      console.log('✅ Schema migration completed');

      const seedSql = readFileSync(path.join(migrationsFolder, '0001_seed_data.sql'), 'utf-8');
      await pool.query(seedSql);
      console.log('✅ Seed data migration completed');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Database migrations completed in ${duration}ms`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('⚠️  API will not start. Fix database issues and restart.');
    throw error; // Crash container to prevent broken state
  } finally {
    await pool.end();
  }
}
