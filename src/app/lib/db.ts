// src/lib/db.ts
import { Pool } from 'pg';

// สร้าง connection pool สำหรับ PostgreSQL
// Pool จะจัดการ connections อัตโนมัติ ทำให้มีประสิทธิภาพดีกว่าสร้าง connection ใหม่ทุกครั้ง
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // จำนวน connection สูงสุดใน pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;