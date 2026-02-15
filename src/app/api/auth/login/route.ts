// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../../lib/db';
import { AuthResponse, User } from '../../../types';

// กำหนด type สำหรับ request body ที่คาดหวัง
interface LoginRequestBody {
  email: string;
  password: string;
}

// กำหนด type สำหรับข้อมูลผู้ใช้ที่ดึงจาก database
interface UserRow {
  id: number;
  email: string;
  password: string;
  created_at: Date;
}

export async function POST(request: NextRequest) {
  try {
    // แปลง request body เป็น object และกำหนด type
    const body: LoginRequestBody = await request.json();
    const { email, password } = body;

    // Validation - ตรวจสอบว่ามีข้อมูลครบหรือไม่
    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้ในฐานข้อมูล
    // เราใช้ generic type <UserRow[]> เพื่อบอก TypeScript ว่าผลลัพธ์จะเป็นอย่างไร
    const result = await pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    // ถ้าไม่พบผู้ใช้ ส่งข้อความผิดพลาดกลับไป
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const user: UserRow = result.rows[0];

    // เปรียบเทียบรหัสผ่านที่แฮชแล้ว
    const isValidPassword: boolean = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // สร้าง JWT token สำหรับการยืนยันตัวตน
    const token: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // สร้าง response object ตาม AuthResponse type
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at.toISOString(),
      },
      token,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}