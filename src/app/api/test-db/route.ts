// src/app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import pool from '../../lib/db';

export async function GET() {
  try {
    console.log('🧪 Testing database connection...');
    
    // ลองเชื่อมต่อและ query ข้อมูลง่ายๆ
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // ทดสอบ query เวลาปัจจุบัน
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful, current time:', timeResult.rows[0].current_time);
    
    // ตรวจสอบว่าตาราง users มีอยู่หรือไม่
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    console.log('📊 Users table exists:', tableExists);
    
    // ถ้าตารางมีอยู่ ลองนับจำนวนผู้ใช้
    let userCount = 0;
    if (tableExists) {
      const countResult = await client.query('SELECT COUNT(*) FROM users');
      userCount = parseInt(countResult.rows[0].count);
      console.log('👥 Number of users:', userCount);
    }
    
    client.release();
    console.log('🔌 Connection released');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      currentTime: timeResult.rows[0].current_time,
      usersTableExists: tableExists,
      userCount: userCount,
    });
    
  } catch (error: any) {
    console.error('❌ Database test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      hint: getErrorHint(error.code, error.message),
    }, { status: 500 });
  }
}

// ฟังก์ชันช่วยแปลง error code เป็นคำแนะนำที่เข้าใจง่าย
function getErrorHint(code: string, message: string): string {
  if (code === 'ECONNREFUSED') {
    return 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบ DATABASE_URL ใน .env.local';
  } else if (message.includes('password authentication failed')) {
    return 'รหัสผ่านฐานข้อมูลไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านใน DATABASE_URL';
  } else if (code === '42P01') {
    return 'ตารางในฐานข้อมูลยังไม่ได้สร้าง กรุณารัน SQL schema ใน Supabase SQL Editor';
  } else if (message.includes('no pg_hba.conf entry')) {
    return 'การเข้าถึงฐานข้อมูลถูกปิดกั้น กรุณาตรวจสอบ SSL configuration';
  }
  
  return 'กรุณาตรวจสอบการตั้งค่าฐานข้อมูลและลองใหม่อีกครั้ง';
}