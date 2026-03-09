// src/app/api/decks/[deckId]/cards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import jwt from 'jsonwebtoken';

export async function POST(
  request: NextRequest,
  { params }: { params: { deckId: string } }
): Promise<NextResponse> {
  console.log('📝 Adding card to deck...');

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
    const deckId = parseInt(params.deckId);
    const body = await request.json();
    const { term, definition } = body;

    if (!term || !definition) {
      return NextResponse.json(
        { success: false, error: 'กรุณาใส่ทั้งคำศัพท์และคำตอบ' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // ตรวจสอบความเป็นเจ้าของ
      const deckCheck = await client.query(
        'SELECT user_id FROM decks WHERE id = $1',
        [deckId]
      );

      if (deckCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบชุดการ์ดนี้' },
          { status: 404 }
        );
      }

      if (deckCheck.rows[0].user_id !== userId) {
        return NextResponse.json(
          { success: false, error: 'คุณไม่มีสิทธิ์เพิ่มการ์ดในชุดนี้' },
          { status: 403 }
        );
      }

      // เพิ่มการ์ด
      const result = await client.query(
        `INSERT INTO cards (deck_id, term, definition) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [deckId, term.trim(), definition.trim()]
      );

      console.log(`✅ Card added: ${term}`);

      return NextResponse.json({
        success: true,
        card: result.rows[0],
        message: 'เพิ่มการ์ดสำเร็จ',
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error adding card:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถเพิ่มการ์ดได้',
        details: error.message,
      },
      { status: 500 }
    );
  }
}