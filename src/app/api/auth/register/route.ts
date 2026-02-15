// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../../lib/db';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // เพิ่ม logging เพื่อดูว่า request เข้ามาถูกต้องหรือไม่
  console.log('📝 Register API called');

  try {
    // แยกข้อมูลจาก request body
    const body = await request.json();
    const { email, password } = body;

    // ตรวจสอบว่ามีข้อมูลครบหรือไม่
    console.log('📧 Email received:', email);
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ารหัสผ่านยาวพอหรือไม่
    if (password.length < 6) {
      console.log('❌ Password too short');
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าอีเมลนี้มีในระบบแล้วหรือยัง
    console.log('🔍 Checking if email exists...');
    
    let client;
    try {
      // เชื่อมต่อฐานข้อมูล
      client = await pool.connect();
      console.log('✅ Database connected successfully');

      // ค้นหาผู้ใช้ที่มีอีเมลนี้อยู่แล้ว
      const checkQuery = 'SELECT * FROM users WHERE email = $1';
      const checkResult = await client.query(checkQuery, [email]);

      if (checkResult.rows.length > 0) {
        console.log('❌ Email already exists');
        return NextResponse.json(
          { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
          { status: 400 }
        );
      }

      console.log('✅ Email is available');

      // เข้ารหัสรหัสผ่าน
      // bcrypt จะสร้าง salt และ hash รหัสผ่านให้เราอัตโนมัติ
      // เลข 10 คือจำนวนรอบของการเข้ารหัส ยิ่งมากยิ่งปลอดภัยแต่ช้ากว่า
      console.log('🔐 Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('✅ Password hashed successfully');

      // บันทึกผู้ใช้ใหม่ลงฐานข้อมูล
      console.log('💾 Inserting new user...');
      const insertQuery = `
        INSERT INTO users (email, password, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id, email, created_at
      `;
      
      const insertResult = await client.query(insertQuery, [email, hashedPassword]);
      const newUser = insertResult.rows[0];

      console.log('✅ User created successfully:', newUser.id);

      // ตรวจสอบว่ามี JWT_SECRET หรือไม่
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('❌ JWT_SECRET is not defined');
        throw new Error('Server configuration error: JWT_SECRET is missing');
      }

      // สร้าง JWT token สำหรับผู้ใช้ใหม่
      console.log('🔑 Creating JWT token...');
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        jwtSecret,
        { expiresIn: '7d' } // token จะหมดอายุใน 7 วัน
      );

      console.log('✅ Registration completed successfully');

      // ส่งข้อมูลกลับไปยัง client
      return NextResponse.json({
        message: 'สมัครสมาชิกสำเร็จ',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
        },
      }, { status: 201 });

    } catch (dbError: any) {
      // จัดการ error ที่เกิดจากฐานข้อมูลโดยเฉพาะ
      console.error('❌ Database error:', dbError);
      
      // แสดง error message ที่เฉพาะเจาะจง
      if (dbError.code === '42P01') {
        // Table does not exist
        return NextResponse.json(
          { 
            error: 'ตารางในฐานข้อมูลยังไม่ได้สร้าง กรุณาตรวจสอบว่าได้รัน SQL schema แล้วหรือยัง',
            details: 'Table "users" does not exist'
          },
          { status: 500 }
        );
      } else if (dbError.code === '23505') {
        // Unique violation
        return NextResponse.json(
          { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
          { status: 400 }
        );
      } else if (dbError.code === 'ECONNREFUSED') {
        // Connection refused
        return NextResponse.json(
          { 
            error: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
            details: 'กรุณาตรวจสอบ DATABASE_URL ใน .env.local'
          },
          { status: 500 }
        );
      } else if (dbError.message.includes('password authentication failed')) {
        // Authentication failed
        return NextResponse.json(
          { 
            error: 'รหัสผ่านฐานข้อมูลไม่ถูกต้อง',
            details: 'กรุณาตรวจสอบรหัสผ่านใน DATABASE_URL'
          },
          { status: 500 }
        );
      }
      
      // Error อื่นๆ ที่ไม่ระบุ
      return NextResponse.json(
        { 
          error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก',
          details: dbError.message 
        },
        { status: 500 }
      );

    } finally {
      // ปิดการเชื่อมต่อฐานข้อมูลเสมอ ไม่ว่าจะสำเร็จหรือเกิด error
      if (client) {
        client.release();
        console.log('🔌 Database connection released');
      }
    }

  } catch (error: any) {
    // จัดการ error ทั่วไปที่ไม่เกี่ยวกับฐานข้อมูล
    console.error('❌ General error:', error);
    
    return NextResponse.json(
      { 
        error: 'เกิดข้อผิดพลาดในการดำเนินการ',
        details: error.message 
      },
      { status: 500 }
    );
  }
}