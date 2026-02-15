// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '../../../lib/db';

interface ResetPasswordRequestBody {
  email: string;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResetPasswordRequestBody = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีผู้ใช้นี้อยู่จริง
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้นี้ในระบบ' },
        { status: 404 }
      );
    }

    // แฮชรหัสผ่านใหม่
    const hashedPassword: string = await bcrypt.hash(newPassword, 10);

    // อัปเดตรหัสผ่าน
    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    return NextResponse.json(
      { message: 'รีเซ็ตรหัสผ่านสำเร็จ' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' },
      { status: 500 }
    );
  }
}