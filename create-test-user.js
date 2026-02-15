const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// ถ้า DATABASE_URL ไม่ถูกตั้งค่า ให้ใช้ค่าเริ่มต้นนี้
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/flashcard_app';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function createTestUser() {
  try {
    console.log('🔄 กำลังสร้างผู้ใช้ทดสอบ...');
    
    const email = 'test@example.com';
    const password = 'Test123!@#';
    
    // ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ ผู้ใช้นี้มีอยู่แล้ว');
      console.log(`📧 อีเมล: ${email}`);
      console.log(`🔐 รหัสผ่าน: ${password}`);
      process.exit(0);
    }
    
    // แฮชรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // บันทึกผู้ใช้ใหม่
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword]
    );
    
    const user = result.rows[0];
    
    console.log('✅ สร้างผู้ใช้สำเร็จ!');
    console.log('-------------------');
    console.log(`📧 อีเมล: ${user.email}`);
    console.log(`🔐 รหัสผ่าน: ${password}`);
    console.log(`👤 ID: ${user.id}`);
    console.log(`⏰ สร้างเมื่อ: ${user.created_at}`);
    console.log('-------------------');
    console.log('💡 ท่านสามารถใช้ข้อมูลนี้เข้าสู่ระบบได้เลย!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    console.error('\n⚠️  กรุณาตรวจสอบ:');
    console.error('1. DATABASE_URL ถูกตั้งค่าถูกต้องหรือไม่');
    console.error('2. PostgreSQL server กำลังทำงานหรือไม่');
    console.error('3. ฐานข้อมูลและตาราง users ถูกสร้างแล้วหรือไม่');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestUser();
