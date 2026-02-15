// src/lib/db.ts
import { Pool } from 'pg';

// สร้าง connection pool สำหรับ PostgreSQL
// เราใช้ DATABASE_URL จาก Supabase ที่เราตั้งค่าไว้ใน .env.local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Supabase ต้องการ SSL connection
    // rejectUnauthorized: false หมายความว่าเรายอมรับ certificate ทุกประเภท
    // ในการใช้งานจริงควรตั้งเป็น true และใช้ certificate ที่ถูกต้อง
    rejectUnauthorized: false,
  },
  max: 20, // จำนวน connection สูงสุดใน pool
  idleTimeoutMillis: 30000, // ปิด connection ที่ไม่ได้ใช้งานหลังจาก 30 วินาที
  connectionTimeoutMillis: 2000, // timeout การเชื่อมต่อหลังจาก 2 วินาที
});

// เพิ่ม error handler สำหรับ pool
// ถ้ามีข้อผิดพลาดในการเชื่อมต่อ เราจะได้รู้ทันที
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// ทดสอบการเชื่อมต่อเมื่อ server เริ่มทำงาน
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

export default pool;