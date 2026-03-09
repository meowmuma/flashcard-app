import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { name, username, email, password } = await request.json();

    // ✅ ตรวจสอบข้อมูล
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // ✅ เช็คว่าซ้ำไหม
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' },
          { status: 400 }
        );
      }

      // ✅ เข้ารหัสรหัสผ่าน
      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ เพิ่ม name เข้าไปใน INSERT
      const result = await client.query(
        `INSERT INTO users (name, username, email, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, username, email`,
        [name, username, email, hashedPassword]
      );

      const user = result.rows[0];

      // ✅ สร้าง token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return NextResponse.json({
        success: true,
        token,
        user,
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลงทะเบียน' },
      { status: 500 }
    );
  }
}