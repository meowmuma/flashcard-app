// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../../lib/db';
import { AuthResponse } from '../../../types';

interface RegisterRequestBody {
  email: string;
  password: string;
}

interface UserRow {
  id: number;
  email: string;
  created_at: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequestBody = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าอีเมลถูกใช้งานแล้วหรือยัง
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
        { status: 409 }
      );
    }

    // แฮชรหัสผ่าน - เราระบุว่า hashedPassword เป็น string
    const hashedPassword: string = await bcrypt.hash(password, 10);

    // บันทึกผู้ใช้ใหม่ลงฐานข้อมูล
    const result = await pool.query<UserRow>(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword]
    );

    const newUser: UserRow = result.rows[0];

    // สร้าง JWT token
    const token: string = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    const response: AuthResponse = {
      user: {
        id: newUser.id,
        email: newUser.email,
        created_at: newUser.created_at.toISOString(),
      },
      token,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
      { status: 500 }
    );
  }
}