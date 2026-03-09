import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { username, email, password } = await request.json();
    const loginIdentifier = username || email;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // ✅ เพิ่ม name เข้า SELECT
      const result = await client.query(
        `SELECT id,  username, email, password_hash 
         FROM users 
         WHERE username = $1 OR email = $1`,
        [loginIdentifier]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      const user = result.rows[0];

      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return NextResponse.json(
          { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,      
          username: user.username,
          email: user.email,
        },
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}