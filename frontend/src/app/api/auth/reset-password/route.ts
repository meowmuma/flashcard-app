// src/app/api/auth/reset-password/route.ts - โค้ดสำหรับรีเซ็ตรหัสผ่าน
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่านใหม่' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'ไม่พบอีเมลนี้ในระบบ' },
          { status: 404 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      );

      return NextResponse.json({
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ',
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' },
      { status: 500 }
    );
  }
}