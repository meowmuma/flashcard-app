// src/app/api/study-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../lib/db';
import jwt from 'jsonwebtoken';

// API สำหรับบันทึกประวัติการเรียน
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('📝 Recording study session...');

  try {
    // ตรวจสอบ token เพื่อยืนยันตัวตนผู้ใช้
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token การยืนยันตัวตน' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    // ถอดรหัส token เพื่อดึง userId ออกมา
    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    const userId = decoded.userId;

    const body = await request.json();
    const { deck_id, total_cards, known_cards, unknown_cards } = body;

    // ตรวจสอบว่าข้อมูลที่ส่งมาครบถ้วนหรือไม่
    if (!deck_id || total_cards === undefined || known_cards === undefined || unknown_cards === undefined) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    // คำนวณเปอร์เซ็นต์ความแม่นยำ
    const accuracy = total_cards > 0 ? Math.round((known_cards / total_cards) * 100) : 0;

    const client = await pool.connect();

    try {
      // บันทึกประวัติการเรียนลงฐานข้อมูล
      const result = await client.query(
        `INSERT INTO study_history 
         (user_id, deck_id, total_cards, known_cards, unknown_cards, accuracy_percentage) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [userId, deck_id, total_cards, known_cards, unknown_cards, accuracy]
      );

      const session = result.rows[0];

      console.log(`✅ Study session recorded: ${known_cards}/${total_cards} cards (${accuracy}%)`);

      // ส่งข้อมูลกลับไปพร้อมกับ session id
      return NextResponse.json({
        success: true,
        session: session,
        message: 'บันทึกประวัติการเรียนสำเร็จ',
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error recording study session:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถบันทึกประวัติการเรียนได้',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// API สำหรับดึงประวัติการเรียนทั้งหมดของผู้ใช้
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('📚 Fetching study history...');

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token การยืนยันตัวตน' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    const userId = decoded.userId;

    const client = await pool.connect();

    try {
      // ดึงประวัติการเรียนพร้อมกับชื่อชุดการ์ด เรียงตามวันที่ล่าสุด
      const result = await client.query(
        `SELECT 
          sh.*,
          d.title as deck_title
         FROM study_history sh
         INNER JOIN decks d ON sh.deck_id = d.id
         WHERE sh.user_id = $1
         ORDER BY sh.completed_at DESC
         LIMIT 50`,
        [userId]
      );

      console.log(`✅ Found ${result.rows.length} study sessions`);

      return NextResponse.json({
        success: true,
        sessions: result.rows,
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error fetching study history:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถดึงประวัติการเรียนได้',
        details: error.message,
      },
      { status: 500 }
    );
  }
}