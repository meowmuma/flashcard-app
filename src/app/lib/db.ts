// src/lib/db.ts - ตรวจสอบการเชื่อมต่อ Supabase
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// ทดสอบการเชื่อมต่อเมื่อ import
pool.on('connect', () => {
  console.log('🔗 Database connected successfully at:', new Date().toISOString());
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

export default pool;